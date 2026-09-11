import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AiPill } from "../../src/screens/Navigation";

const PRIMARY = "#287dfa";

const NOTIFICATIONS = [
  {
    id: "1",
    icon: "airplane",
    color: "#287dfa",
    title: "Flight PK-302 confirmed",
    body: "Your Dhaka → Bangkok flight is confirmed. Check-in opens 24h before.",
    time: "11:13 PM",
    unread: true,
  },
  {
    id: "2",
    icon: "bed",
    color: "#10b981",
    title: "Hotel booking confirmed",
    body: "Ocean View Resort — Cox's Bazar. Check-in Dec 01.",
    time: "10:52 PM",
    unread: true,
  },
  {
    id: "3",
    icon: "pricetag",
    color: "#f59e0b",
    title: "Flash Deal: 35% off Bangkok",
    body: "Limited seats. Grab the Bangkok 5D package before it expires!",
    time: "Yesterday",
    unread: false,
  },
  {
    id: "4",
    icon: "refresh-circle",
    color: "#8b5cf6",
    title: "Refund processed",
    body: "Your refund of ৳3,500 has been credited to Shopno Wallet.",
    time: "2 days ago",
    unread: false,
  },
  {
    id: "5",
    icon: "star",
    color: "#f59e0b",
    title: "New rewards earned",
    body: "You earned 250 Trip Coins from your last booking!",
    time: "3 days ago",
    unread: false,
  },
];

const QUICK_ACTIONS = [
  {
    label: "Live Streams",
    icon: "radio",
    route: "/(screens)/live",
    color: "#ef4444",
  },
  {
    label: "Support Chat",
    icon: "chatbubble-ellipses",
    route: "/(screens)/customer-support",
    color: "#287dfa",
  },
  {
    label: "Agency Chat",
    icon: "business",
    route: "/(screens)/agency-chat",
    color: "#10b981",
  },
  {
    label: "Community",
    icon: "people",
    route: "/(screens)/travel-community-posts",
    color: "#8b5cf6",
  },
];

export default function MessagesTab() {
  return (
    <SafeAreaView style={s.shell}>
      <View style={s.header}>
        <Text style={s.title}>Messages</Text>
        <Pressable style={s.markAllBtn} onPress={() => {}}>
          <Text style={s.markAllText}>Mark all read</Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
      >
        {/* Quick Actions */}
        <View style={s.quickRow}>
          {QUICK_ACTIONS.map((qa) => (
            <Pressable
              key={qa.label}
              style={s.quickItem}
              onPress={() => router.push(qa.route as any)}
            >
              <View style={[s.quickIcon, { backgroundColor: `${qa.color}15` }]}>
                <Ionicons name={qa.icon as any} size={20} color={qa.color} />
              </View>
              <Text style={s.quickLabel}>{qa.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Notifications */}
        <Text style={s.sectionTitle}>Notifications</Text>
        {NOTIFICATIONS.map((n) => (
          <Pressable
            key={n.id}
            style={[s.notifCard, n.unread && s.notifUnread]}
          >
            <View style={[s.notifIcon, { backgroundColor: `${n.color}15` }]}>
              <Ionicons name={n.icon as any} size={20} color={n.color} />
            </View>
            <View style={s.notifBody}>
              <View style={s.notifTitleRow}>
                <Text style={[s.notifTitle, n.unread && s.notifTitleUnread]}>
                  {n.title}
                </Text>
                {n.unread && (
                  <View style={[s.unreadDot, { backgroundColor: PRIMARY }]} />
                )}
              </View>
              <Text style={s.notifText} numberOfLines={2}>
                {n.body}
              </Text>
              <Text style={s.notifTime}>{n.time}</Text>
            </View>
          </Pressable>
        ))}

      <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  shell: { flex: 1, backgroundColor: "#f5f7fa" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f2f4f7",
  },
  title: { fontSize: 22, fontWeight: "900", color: "#111827" },
  markAllBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  markAllText: { fontSize: 13, color: PRIMARY, fontWeight: "700" },
  scroll: { padding: 16 },
  quickRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  quickItem: { flex: 1, alignItems: "center", gap: 6 },
  quickIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  quickLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#374151",
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 10,
  },
  notifCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  notifUnread: { borderLeftWidth: 3, borderLeftColor: PRIMARY },
  notifIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  notifBody: { flex: 1 },
  notifTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 3,
  },
  notifTitle: { fontSize: 13, fontWeight: "700", color: "#374151", flex: 1 },
  notifTitleUnread: { color: "#111827", fontWeight: "900" },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  notifText: { fontSize: 12, color: "#667085", lineHeight: 17 },
  notifTime: { fontSize: 11, color: "#9ca3af", marginTop: 4 },
});
