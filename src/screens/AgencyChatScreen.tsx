import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { useAuth } from "../hooks/useAuth";
import { supabase } from "../utils/supabase";
import { BottomNav, AiPill } from "./Navigation";

const PRIMARY = "#287dfa";

interface AgencyEnquiryItem {
  id: string;
  agency_id: string;
  agency_name: string;
  agency_logo?: string;
  message: string;
  status: string;
  created_at: string;
}

interface AgencySummary {
  id: string;
  name: string;
  logo_url?: string;
}

export function AgencyChatScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{ agencyId?: string; agencyName?: string }>();
  
  const [enquiries, setEnquiries] = useState<AgencyEnquiryItem[]>([]);
  const [agencies, setAgencies] = useState<AgencySummary[]>([]);
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>(params.agencyId || "");
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Load agencies list
  useEffect(() => {
    async function loadAgencies() {
      try {
        const { data } = await supabase
          .from("agencies")
          .select("id, name, logo_url")
          .order("name", { ascending: true });

        if (data && data.length > 0) {
          setAgencies(data);
          if (!selectedAgencyId) {
            setSelectedAgencyId(data[0].id);
          }
        }
      } catch (err) {
        console.warn("Error loading agencies for chat:", err);
      }
    }
    loadAgencies();
  }, []);

  // Load user enquiries
  const loadEnquiries = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("agency_enquiries")
        .select("id, agency_id, message, status, created_at, agency:agencies(id, name, logo_url)")
        .order("created_at", { ascending: false });

      if (user?.id) {
        query = query.eq("user_id", user.id);
      }

      const { data, error } = await query;
      if (!error && data) {
        const mapped: AgencyEnquiryItem[] = data.map((d: any) => ({
          id: d.id,
          agency_id: d.agency_id,
          agency_name: d.agency?.name || "Travel Agency",
          agency_logo: d.agency?.logo_url,
          message: d.message,
          status: d.status || "new",
          created_at: d.created_at,
        }));
        setEnquiries(mapped);
      }
    } catch (err) {
      console.warn("Error loading agency enquiries:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadEnquiries();

    const channel = supabase
      .channel(`agency-chat-${Math.random().toString(36).substring(2, 7)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "agency_enquiries" }, () => {
        loadEnquiries();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadEnquiries]);

  // Send message / enquiry
  const handleSend = async () => {
    const text = messageText.trim();
    if (!text) return;
    if (!selectedAgencyId) {
      Alert.alert("Select Agency", "Please select an agency to send your message to.");
      return;
    }

    setSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const payload: any = {
        agency_id: selectedAgencyId,
        message: text,
        status: "new",
      };
      if (user?.id) {
        payload.user_id = user.id;
      }

      const { error } = await supabase.from("agency_enquiries").insert([payload]);
      if (error) throw error;

      setMessageText("");
      loadEnquiries();
      Alert.alert("Enquiry Sent", "The travel agency will reply shortly.");
    } catch (err: any) {
      Alert.alert("Send Error", err.message || "Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const selectedAgency = agencies.find((a) => a.id === selectedAgencyId);

  return (
    <SafeAreaView style={s.shell}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color={PRIMARY} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Agency Inquiries & Chat</Text>
          <Text style={s.subtitle}>
            {selectedAgency ? `Talking to ${selectedAgency.name}` : "Connect with certified agencies"}
          </Text>
        </View>
      </View>

      {/* Agency Picker Carousel */}
      {agencies.length > 0 && (
        <View style={s.agencyPickerWrap}>
          <Text style={s.pickerLabel}>Choose Agency:</Text>
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
                    size={14}
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

      {/* Messages List */}
      {loading ? (
        <ActivityIndicator color={PRIMARY} size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={enquiries}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.list}
          renderItem={({ item }) => (
            <View style={s.chatItem}>
              <View style={s.chatAvatar}>
                {item.agency_logo ? (
                  <Image source={{ uri: item.agency_logo }} style={s.avatarImg} />
                ) : (
                  <Ionicons name="business" size={20} color={PRIMARY} />
                )}
              </View>
              <View style={s.chatContent}>
                <View style={s.chatHeaderRow}>
                  <Text style={s.chatAgency}>{item.agency_name}</Text>
                  <View style={[s.statusBadge, item.status === "replied" && s.statusReplied]}>
                    <Text style={[s.statusText, item.status === "replied" && s.statusTextReplied]}>
                      {item.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={s.chatMessage}>{item.message}</Text>
                <Text style={s.chatTime}>
                  {new Date(item.created_at).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="chatbubbles-outline" size={54} color="#d1d5db" />
              <Text style={s.emptyText}>No inquiries or messages yet</Text>
              <Text style={s.emptySubText}>
                Select an agency above and send an inquiry regarding packages, flights, or customized itineraries.
              </Text>
            </View>
          }
        />
      )}

      {/* Message Input */}
      <View style={s.inputRow}>
        <TextInput
          placeholder={
            selectedAgency
              ? `Message ${selectedAgency.name}...`
              : "Type your travel question..."
          }
          placeholderTextColor="#9ca3af"
          style={s.input}
          value={messageText}
          onChangeText={setMessageText}
        />
        <Pressable
          style={[s.sendBtn, (!messageText.trim() || sending) && s.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!messageText.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={18} color="#fff" />
          )}
        </Pressable>
      </View>

      <AiPill color={PRIMARY} />
      <BottomNav active="Messages" color={PRIMARY} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  shell: { flex: 1, backgroundColor: "#f5f7fa" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  backBtn: { padding: 4 },
  title: { fontSize: 17, fontWeight: "800", color: "#111827" },
  subtitle: { fontSize: 12, color: "#6b7280", marginTop: 1 },
  agencyPickerWrap: {
    backgroundColor: "#fff",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f2f5",
  },
  pickerLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9ca3af",
    textTransform: "uppercase",
    paddingHorizontal: 16,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  pickerList: { paddingHorizontal: 16, gap: 8 },
  agencyChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f0f6ff",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  agencyChipActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  agencyChipText: { fontSize: 13, fontWeight: "600", color: PRIMARY },
  agencyChipTextActive: { color: "#FFFFFF" },
  list: { padding: 16 },
  chatItem: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  chatAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: `${PRIMARY}15`,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: { width: 42, height: 42 },
  chatContent: { flex: 1 },
  chatHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  chatAgency: { fontSize: 14, fontWeight: "700", color: "#111827" },
  statusBadge: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusReplied: { backgroundColor: "#d1fae5" },
  statusText: { fontSize: 10, fontWeight: "700", color: "#b45309" },
  statusTextReplied: { color: "#065f46" },
  chatMessage: { fontSize: 13, color: "#374151", lineHeight: 18 },
  chatTime: { fontSize: 11, color: "#9ca3af", marginTop: 6 },
  empty: { alignItems: "center", paddingVertical: 60, paddingHorizontal: 32 },
  emptyText: { fontSize: 16, fontWeight: "700", color: "#4b5563", marginTop: 12 },
  emptySubText: {
    fontSize: 13,
    color: "#9ca3af",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { opacity: 0.5 },
});