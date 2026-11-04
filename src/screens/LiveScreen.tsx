import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useState, useEffect } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { router } from "expo-router";
import { BottomNav, AiPill } from "./Navigation";
import { TopBar } from "./TopBar";
import { supabase } from "../utils/supabase";
import type { UIScreen } from "../data/screens";

const PRIMARY = "#287dfa";

type CallType = "video" | "voice" | "group";

export function LiveScreen({ screen }: { screen: UIScreen }) {
  const [activeStream, setActiveStream] = useState<any>(null);
  const [filter, setFilter] = useState<"all" | "agency" | "influencer" | "destination" | "event">("all");
  const [liveStreams, setLiveStreams] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchLive = async () => {
      try {
        setLoading(true);
        // 1. Try querying live_streams table
        const { data: streamData } = await supabase
          .from("live_streams")
          .select("*")
          .eq("status", "live");

        if (streamData && streamData.length > 0) {
          setLiveStreams(streamData.map((s: any) => ({
            id: s.id,
            type: s.category || "agency",
            host: s.streamer_name || "Official Host",
            title: s.title,
            viewers: s.viewers_count || 120,
            thumbnail: s.thumbnail_url,
            isLive: true,
            badge: s.category === 'influencer' ? '⭐ Influencer' : '🏢 Agency',
          })));
          return;
        }

        // 2. Query active live stories from verified community profiles
        const { data: storyData } = await supabase
          .from("stories")
          .select("*, user:community_profiles(*)")
          .order("created_at", { ascending: false });

        if (storyData && storyData.length > 0) {
          setLiveStreams(storyData.map((st: any) => ({
            id: st.id,
            type: st.user?.is_influencer ? "influencer" : "agency",
            host: st.user?.display_name || st.user?.username || "Verified Explorer",
            title: st.caption || `Live from ${st.location || 'Bangladesh'}`,
            viewers: Math.round(Number(st.user?.followers_count || 1000) * 0.12),
            thumbnail: st.media_url,
            isLive: true,
            badge: st.user?.is_influencer ? '⭐ Influencer' : '🏢 Agency',
          })));
        } else {
          setLiveStreams([]);
        }
      } catch (err) {
        console.error("Error loading live broadcasts:", err);
        setLiveStreams([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLive();

    const channel = supabase
      .channel(`live-screen-${Math.random().toString(36).substring(2, 7)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "stories" }, () => {
        fetchLive();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const filtered = filter === "all" ? liveStreams : liveStreams.filter((s) => s.type === filter);

  const startCall = (type: CallType) => {
    router.push({
      pathname: "/screens/call",
      params: {
        isVideo: type === "voice" ? "false" : "true",
        name: type === "group" ? "Travel Community Live Room" : type === "video" ? "Agency Tour Guide" : "Support Specialist",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300",
      },
    });
  };

  if (activeStream) {
    return (
      <SafeAreaView style={[s.shell, { backgroundColor: "#0f172a" }]}>
        <Image source={{ uri: activeStream.thumbnail }} style={s.streamFull} />
        <LinearGradient colors={["rgba(0,0,0,0.7)", "transparent"]} style={s.streamTopBar}>
          <Pressable onPress={() => setActiveStream(null)} style={s.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </Pressable>
          <View style={s.liveBadge}><Text style={s.liveBadgeText}>● LIVE</Text></View>
          <View style={s.viewerCount}>
            <Ionicons name="eye-outline" size={14} color="#fff" />
            <Text style={s.viewerText}>{activeStream.viewers}</Text>
          </View>
        </LinearGradient>
        <LinearGradient colors={["transparent", "rgba(0,0,0,0.9)"]} style={s.streamBottomBar}>
          <View style={s.streamInfo}>
            <Text style={s.streamHost}>{activeStream.host}</Text>
            <Text style={s.streamTitle}>{activeStream.title}</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.shell}>
      <TopBar screen={screen} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterTabs}>
          {["all", "agency", "influencer", "destination", "event"].map((f) => (
            <Pressable key={f} onPress={() => setFilter(f as any)} style={[s.filterTab, filter === f && s.filterTabActive]}>
              <Text style={[s.filterTabText, filter === f && s.filterTabTextActive]}>{f.toUpperCase()}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={s.sectionTitle}>🔴 Live Now</Text>
        {filtered.length === 0 ? (
          <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 40, backgroundColor: "#fff", borderRadius: 16, marginBottom: 14 }}>
            <Ionicons name="videocam-outline" size={44} color="#94a3b8" />
            <Text style={{ marginTop: 8, fontSize: 14, fontWeight: "700", color: "#475569" }}>
              No Live Streams Right Now
            </Text>
            <Text style={{ marginTop: 2, fontSize: 12, color: "#94a3b8" }}>
              Agency webinars and influencer broadcasts will appear here when active.
            </Text>
          </View>
        ) : (
          filtered.map((stream) => (
            <Pressable key={stream.id} onPress={() => stream.isLive && setActiveStream(stream)} style={s.streamCard}>
              <Image source={{ uri: stream.thumbnail }} style={s.streamThumb} />
              <LinearGradient colors={["transparent", "rgba(0,0,0,0.8)"]} style={s.streamOverlay}>
                <View style={s.livePill}><Text style={s.livePillText}>● LIVE</Text></View>
                <View style={s.streamCardBadge}><Text style={s.streamCardBadgeText}>{stream.badge}</Text></View>
                <Text style={s.streamCardTitle}>{stream.title}</Text>
                <View style={s.streamCardMeta}>
                  <Text style={s.streamCardHost}>{stream.host}</Text>
                  <View style={s.viewerPill}>
                    <Ionicons name="eye-outline" size={12} color="#fff" />
                    <Text style={s.viewerPillText}>{stream.viewers}</Text>
                  </View>
                </View>
              </LinearGradient>
            </Pressable>
          ))
        )}

        <Text style={s.sectionTitle}>📞 Start a Call</Text>
        <View style={s.callGrid}>
          <CallCard icon="videocam" label="Video Call" desc="1-on-1" color="#287dfa" onPress={() => startCall("video")} />
          <CallCard icon="call" label="Voice Call" desc="Clear Audio" color="#10b981" onPress={() => startCall("voice")} />
          <CallCard icon="people" label="Group" desc="Up to 50" color="#8b5cf6" onPress={() => startCall("group")} />
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
      <AiPill color={PRIMARY} />
      <BottomNav active="Messages" color={PRIMARY} />
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
  shell: { flex: 1, backgroundColor: "#f5f7fa" },
  scroll: { padding: 16, paddingBottom: 100 },
  filterTabs: { gap: 8, marginBottom: 14, paddingVertical: 4 },
  filterTab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: "#e5e7eb" },
  filterTabActive: { backgroundColor: PRIMARY },
  filterTabText: { fontSize: 11, fontWeight: "800", color: "#667085" },
  filterTabTextActive: { color: "#fff" },
  sectionTitle: { fontSize: 16, fontWeight: "900", color: "#111827", marginBottom: 10, marginTop: 8 },
  streamCard: { borderRadius: 16, overflow: "hidden", marginBottom: 14, height: 200 },
  streamThumb: { width: "100%", height: "100%" },
  streamOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: "flex-end", padding: 12 },
  livePill: { position: "absolute", top: 10, left: 10, backgroundColor: "#ef4444", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  livePillText: { color: "#fff", fontSize: 11, fontWeight: "900" },
  streamCardBadge: { alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 4 },
  streamCardBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  streamCardTitle: { color: "#fff", fontSize: 15, fontWeight: "800", marginBottom: 4 },
  streamCardMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  streamCardHost: { color: "rgba(255,255,255,0.8)", fontSize: 12 },
  viewerPill: { flexDirection: "row", gap: 4, alignItems: "center", backgroundColor: "rgba(0,0,0,0.4)", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  viewerPillText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  callGrid: { flexDirection: "row", gap: 10 },
  callCard: { flex: 1, backgroundColor: "#fff", borderRadius: 16, padding: 14, alignItems: "center", gap: 8 },
  callCardIcon: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  callCardLabel: { fontSize: 12, fontWeight: "900", color: "#111827" },
  callCardDesc: { fontSize: 10, color: "#9ca3af", textAlign: "center" },
  callScreen: { flex: 1, alignItems: "center", justifyContent: "center", gap: 20 },
  callType: { color: "#fff", fontSize: 18, fontWeight: "900" },
  callAvatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: "#1e293b", alignItems: "center", justifyContent: "center" },
  callStatus: { color: "#94a3b8", fontSize: 14 },
  callActions: { flexDirection: "row", gap: 20, marginTop: 20 },
  callBtn: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" },
  streamFull: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  streamTopBar: { position: "absolute", top: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", gap: 10, padding: 14, paddingTop: 48 },
  backBtn: { padding: 4 },
  liveBadge: { backgroundColor: "#ef4444", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  liveBadgeText: { color: "#fff", fontSize: 13, fontWeight: "900" },
  viewerCount: { flexDirection: "row", gap: 4, alignItems: "center", flex: 1, justifyContent: "flex-end" },
  viewerText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  streamBottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", alignItems: "flex-end", padding: 16, paddingBottom: 32 },
  streamInfo: { flex: 1 },
  streamHost: { color: "rgba(255,255,255,0.8)", fontSize: 13 },
  streamTitle: { color: "#fff", fontSize: 16, fontWeight: "900", marginTop: 2 },
});
