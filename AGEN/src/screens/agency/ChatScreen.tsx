/**
 * Chat Screen
 * High-fidelity guest communication interface with glassmorphism UI
 */

import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "../../App";

interface Message {
  id: string;
  text: string;
  time: string;
  isStaff: boolean;
  status?: "sent" | "read";
}

export default function ChatScreen({ navigation, route }: any) {
  const { name } = route?.params || { name: "Robert Fox" };
  const [inputText, setTextInput] = useState("");
  const scrollViewRef = useRef<ScrollView>(null);

  const messages: Message[] = [
    {
      id: "1",
      text: "Thank you for the quick check-in! Is it possible to get extra towels sent to room 302?",
      time: "10:24 AM",
      isStaff: false,
    },
    {
      id: "2",
      text: "You're very welcome, Mr. Fox! I've sent a request to housekeeping. They'll be at your door in 5 minutes.",
      time: "10:26 AM",
      isStaff: true,
      status: "read",
    },
    {
      id: "3",
      text: "Perfect, thanks!",
      time: "10:27 AM",
      isStaff: false,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => navigation?.goBack()}
            style={styles.backButton}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color={COLORS.primary}
            />
          </TouchableOpacity>

          <View style={styles.userInfo}>
            <View style={styles.avatarContainer}>
              <Image
                source={{
                  uri: "https://lh3.googleusercontent.com/aida-public/AB6AXuDOxtV3TZHgKLsjXbH84TNya8bSNy_eA4o2FJY-tKWIRdYWBgPsnLVeykP5zEigjnxshCK42DPy-rhCsKOPXuP1yLfA2PrzrtDoOB6RTUqwAALTxXhJm62SNiyH4Eu3anr2odUmQDPXWAh-1UI0GB9BNlWpov6l2cBKMJY6_g0b7Gvw-3qSJWzlz0IAU-Rz2OX_-yEPpJibNOR98gCqgsbFR4dIi7EbosqpXAfBp0VsAbaIgVwaajq5IqFZGTDIJGNUxP6SX0IOCm0",
                }}
                style={styles.avatar}
              />
              <View style={styles.onlineIndicator} />
            </View>
            <View style={styles.textContainer}>
              <View style={styles.nameRow}>
                <Text style={styles.userName}>{name}</Text>
                <View style={styles.vipBadge}>
                  <Text style={styles.vipText}>VIP</Text>
                </View>
              </View>
              <Text style={styles.userStatus}>Room 302 • Check-out May 31</Text>
            </View>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerIcon}>
            <MaterialCommunityIcons
              name="magnify"
              size={22}
              color={COLORS.text}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.callButton}>
            <MaterialCommunityIcons name="phone" size={20} color="#000000" />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.chatCanvas}
          contentContainerStyle={styles.chatContent}
          onContentSizeChange={() =>
            scrollViewRef.current?.scrollToEnd({ animated: true })
          }
        >
          {/* Date Separator */}
          <View style={styles.dateSeparator}>
            <View style={styles.separatorLine} />
            <View style={styles.datePill}>
              <Text style={styles.dateText}>Today, 30 May 2024</Text>
            </View>
            <View style={styles.separatorLine} />
          </View>

          {messages.map((msg) => (
            <View
              key={msg.id}
              style={[
                styles.messageRow,
                msg.isStaff ? styles.staffRow : styles.guestRow,
              ]}
            >
              <View
                style={[
                  styles.bubble,
                  msg.isStaff ? styles.staffBubble : styles.guestBubble,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    msg.isStaff
                      ? styles.staffMessageText
                      : styles.guestMessageText,
                  ]}
                >
                  {msg.text}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.timeText}>{msg.time}</Text>
                {msg.isStaff && msg.status === "read" && (
                  <MaterialCommunityIcons
                    name="check-all"
                    size={14}
                    color={COLORS.secondary}
                    style={{ marginLeft: 4 }}
                  />
                )}
              </View>
            </View>
          ))}

          {/* Typing Indicator */}
          <View style={styles.typingIndicator}>
            <View style={styles.typingDots}>
              <View style={styles.dot} />
              <View style={[styles.dot, { opacity: 0.6 }]} />
              <View style={[styles.dot, { opacity: 0.3 }]} />
            </View>
            <Text style={styles.typingText}>{name} is typing...</Text>
          </View>
        </ScrollView>

        {/* Footer Area */}
        <View style={styles.footer}>
          {/* Input Bar */}
          <View style={styles.inputBar}>
            <TouchableOpacity style={styles.attachButton}>
              <MaterialCommunityIcons
                name="plus"
                size={24}
                color={COLORS.textTertiary}
              />
            </TouchableOpacity>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.textInput}
                placeholder="Type a message..."
                placeholderTextColor={COLORS.textTertiary}
                multiline
                value={inputText}
                onChangeText={setTextInput}
              />
            </View>
            <TouchableOpacity
              style={[
                styles.sendButton,
                inputText.trim().length > 0
                  ? styles.sendButtonActive
                  : styles.micButton,
              ]}
            >
              <MaterialCommunityIcons
                name={inputText.trim().length > 0 ? "send" : "microphone"}
                size={22}
                color={inputText.trim().length > 0 ? "#000000" : "white"}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
    backgroundColor: "#0b1326",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  backButton: {
    padding: 4,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(78, 222, 163, 0.3)",
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#4edea3",
    borderWidth: 2,
    borderColor: "#0b1326",
  },
  textContainer: {
    justifyContent: "center",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  userName: {
    color: "#dae2fd",
    fontSize: 16,
    fontWeight: "600",
  },
  vipBadge: {
    backgroundColor: "rgba(255, 185, 95, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(255, 185, 95, 0.3)",
  },
  vipText: {
    color: "#ffb95f",
    fontSize: 8,
    fontWeight: "800",
  },
  userStatus: {
    color: "#908fa0",
    fontSize: 11,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIcon: {
    padding: 6,
  },
  callButton: {
    backgroundColor: COLORS.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  chatCanvas: {
    flex: 1,
  },
  chatContent: {
    padding: 16,
    paddingBottom: 32,
  },
  dateSeparator: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
    gap: 12,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(144, 143, 160, 0.2)",
  },
  datePill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: "rgba(30, 41, 59, 0.7)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  dateText: {
    color: "#908fa0",
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  messageRow: {
    marginBottom: 20,
    maxWidth: "85%",
  },
  guestRow: {
    alignSelf: "flex-start",
  },
  staffRow: {
    alignSelf: "flex-end",
    alignItems: "flex-end",
  },
  bubble: {
    padding: 12,
    borderRadius: 16,
  },
  guestBubble: {
    backgroundColor: "rgba(30, 41, 59, 0.7)",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  staffBubble: {
    backgroundColor: "#8083ff",
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  guestMessageText: {
    color: "#c7c4d7",
  },
  staffMessageText: {
    color: "#0d0096",
    fontWeight: "500",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  timeText: {
    fontSize: 10,
    color: "#908fa0",
  },
  typingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 8,
  },
  typingDots: {
    flexDirection: "row",
    backgroundColor: "rgba(34, 42, 61, 0.8)",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#908fa0",
  },
  typingText: {
    color: "#908fa0",
    fontSize: 12,
    fontStyle: "italic",
  },
  footer: {
    backgroundColor: "rgba(23, 31, 51, 0.8)",
    paddingBottom: Platform.OS === "ios" ? 20 : 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 4,
    gap: 8,
  },
  attachButton: {
    paddingBottom: 10,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: "#0b1326",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(70, 69, 84, 0.4)",
    paddingHorizontal: 12,
    maxHeight: 120,
  },
  textInput: {
    color: "#dae2fd",
    fontSize: 14,
    paddingVertical: 10,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  micButton: {
    backgroundColor: COLORS.primary,
  },
  sendButtonActive: {
    backgroundColor: "#8083ff",
  },
});
