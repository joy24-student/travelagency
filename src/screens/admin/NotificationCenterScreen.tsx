/**
 * Notification Center Screen - Admin Panel
 * Push Notification Broadcaster & Email/SMS Campaign Dispatcher
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";

export const NotificationCenterScreen: React.FC = () => {
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [notificationType, setNotificationType] = useState<"push" | "email" | "sms">("push");

  const handleBroadcast = () => {
    if (!broadcastTitle || !broadcastMessage) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
    Alert.alert(
      "Confirm Broadcast",
      `Are you sure you want to dispatch this ${notificationType.toUpperCase()} notification to ALL active users?`,
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Dispatch",
          onPress: () => {
            Alert.alert("Success", `${notificationType.toUpperCase()} broadcast successfully dispatched.`);
            setBroadcastTitle("");
            setBroadcastMessage("");
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dispatch System Broadcast</Text>

        <Text style={styles.label}>Select Dispatch Channel</Text>
        <View style={styles.channelRow}>
          {(["push", "email", "sms"] as const).map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.channelBtn, notificationType === type && styles.channelBtnActive]}
              onPress={() => setNotificationType(type)}
            >
              <MaterialCommunityIcons
                name={type === "push" ? "cellphone-message" : type === "email" ? "email-multiple" : "message-text"}
                size={20}
                color={notificationType === type ? "#fff" : "#4f46e5"}
              />
              <Text style={[styles.channelText, notificationType === type && styles.channelTextActive]}>
                {type.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Message Title / Subject</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Summer Getaways Flash Sale!"
          value={broadcastTitle}
          onChangeText={setBroadcastTitle}
          placeholderTextColor="#94a3b8"
        />

        <Text style={styles.label}>Message Content</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          multiline
          numberOfLines={4}
          placeholder="Type notification payload content..."
          value={broadcastMessage}
          onChangeText={setBroadcastMessage}
          placeholderTextColor="#94a3b8"
        />

        <TouchableOpacity style={styles.dispatchBtn} onPress={handleBroadcast}>
          <Ionicons name="send" size={18} color="#fff" />
          <Text style={styles.dispatchBtnText}>Broadcast Notification</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    marginTop: 16,
    marginBottom: 8,
  },
  channelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  channelBtn: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  channelBtnActive: {
    backgroundColor: "#4f46e5",
    borderColor: "#4f46e5",
  },
  channelText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4f46e5",
  },
  channelTextActive: {
    color: "#ffffff",
  },
  input: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    color: "#0f172a",
    fontSize: 14,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
    paddingVertical: 12,
  },
  dispatchBtn: {
    flexDirection: "row",
    backgroundColor: "#4f46e5",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 24,
  },
  dispatchBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
});
