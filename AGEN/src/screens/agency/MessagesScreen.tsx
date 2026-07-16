/**
 * Messages Screen
 * Real-time messaging and communication hub
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "../../App";

interface Message {
  id: string;
  name: string;
  message: string;
  time: string;
  unreadCount: number; // Changed from boolean to number for unread count
  avatarUrl?: string; // Added avatarUrl
  online: boolean;
}

export default function MessagesScreen({ navigation }: any) {
  const [refreshing, setRefreshing] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedTab, setSelectedTab] = useState<"All" | "Unread" | "Groups">(
    "All",
  );
  const [searchText, setSearchText] = useState("");

  // Simulate fetching messages
  const fetchMessages = () => {
    return new Promise<Message[]>((resolve) => {
      setTimeout(() => {
        resolve([
          {
            id: "1",
            name: "Cameron Williamson",
            message: "When will my booking be confirmed?",
            time: "2 min",
            unreadCount: 1,
            avatarUrl:
              "https://lh3.googleusercontent.com/aida-public/AB6AXuAM9c-A-xlOiGkntFbjGSw8obYUwzJEIS0SCO3SdQEH18qZJP7lluNZybxavPetXlu2XPXuUoYQqqoAED1JNQuGEKPQPbnWNrWy13rM461E7GX3XpinopbMaWZNVTChLAhrUYMcdzL3PdQrq2hasgwKW4fA36S6pckICooTMUxu0mYtwNRh3KpLzCPrdUmiuPy2v0UjIp9DytqnXNaktqfV0db2YXIcUQ_BjY0s5yQGoCC8cTigWHwQ5z7LcNf-ksrmwN8Cki2VTk",
            online: true,
          },
          {
            id: "2",
            name: "Savannah Nguyen",
            message: "Thank you for the wonderful tour!",
            time: "15 min",
            unreadCount: 0,
            avatarUrl:
              "https://lh3.googleusercontent.com/aida-public/AB6AXuDBVdIffrxHKlEoFhCv_eLnbFRdUBhdDwVNm5a-HKpkQGBcB3clKypD3dE46fpvhukD68EP-WwOY9SaLevkoFkTYaFsf5c0_aB8YGnp-G9LH-iyoUulGefYUMA5Ggue9lTeiTTI5HuQQVOTtCn-QYT11oQpceNZ6E0UaPcaSLEkqeCkcbi_nSA9f3nvZiFaw1_AhjzhwqNsNzBYQuAW8MzqZ0IrhXuiiEh917ifhYaoSS8bAyqaVO7ldi7w5nNVr5tqvah9Li0j200",
            online: true,
          },
          {
            id: "3",
            name: "Robert Fox",
            message: "Can I modify my booking dates?",
            time: "1 hour",
            unreadCount: 5, // Example with multiple unread messages
            avatarUrl:
              "https://lh3.googleusercontent.com/aida-public/AB6AXuAFXcmcQ1W1CNhPZCLA-dpqnwTAf8O54mmzRJKEZcG6UYz_7FKWtQfdYpgmK32-QNUn7Yvj3eVKcFsB0hfBV1PPrakK0HxCi6vtcQXKlHY52xWlzRrk_2V35-Kfn-ujI7ywRYxh4KVOsikcPq8_aOxZDbVtPYTdXbO9wQW-eEYym_zJeNpXvTwxL6IwpUG5GrzNyKn5HabegjXuO-O7yh_WTpgb3OghjTGn5j0H68783TrJ5KP9c6v7nO-iGavew_0nIpzaAJdlXWA",
            online: false,
          },
          {
            id: "4",
            name: "Jenny Wilson",
            message: "Do you offer group discounts?",
            time: "3 hours",
            unreadCount: 0,
            avatarUrl:
              "https://lh3.googleusercontent.com/aida-public/AB6AXuCgTuSmnG8XUMwHl4RAv0Mfvg71Vz3YJnww7AHAXFKVX2njlrQ0mfoMX6vB6iMuHFUvOzyGVE92sRsNnZDh8gyM5G8CrPR7rrKNl9R1sgv2dAGfG-PJB8Ap86f95zStmTSAn0I2sS0_2V-2cvQynfSVqJLsUi1ma94lPmGlWeCBcdu4fWH2cFDa1a2HlBXGLUKTJ3xYtLG3ntHrxYSapxC0TzF6ibJf3PkPN9quq3u2TKe-_CVPIH5cCwcJM55ZxM8Dylz7R_mWUsQ",
            online: false,
          },
          {
            id: "5",
            name: "Alice Johnson",
            message: "Regarding your recent inquiry...",
            time: "Yesterday",
            unreadCount: 0,
            avatarUrl:
              "https://lh3.googleusercontent.com/aida-public/AB6AXuDF9X9UcD0HfC2sQO1hlGa588_DhDh6PhJFBrpu73NsTph6y2qyYVbc5z6vN9lmUUQbucbYEiEVTZ4P2hbYFk_TSX2BO2WTzqkccbJejVoWbER7xoPq9fyK8Rp18kBORAbfelKu0ud8IoQzNyg0dcqWvQrLNIlFZJItCMzFenJx_sYnS90rf3CCXDHRvpm9pk5yu7Md-R879cLAUjbZoX8X6DSvqH9Q6iCrrdShEYAbVylm4uXouffkI4MA_Z7AWxrSTK0DvLXg1KA",
            online: true,
          },
          {
            id: "6",
            name: "Bob Smith",
            message: "Group booking details attached.",
            time: "Yesterday",
            unreadCount: 2,
            avatarUrl:
              "https://lh3.googleusercontent.com/aida-public/AB6AXuDh8EaXSfDDnd_miZaXrJ0qBb7sh9mxDou4Fz6qK423o0VMKaCzREQkRcAuLL2kKzOIYI1ubOCCJDJHyNMZLiz1L2H8cQx6KJomDp5_0RduGgFl0rMJuSBYq_Xye-_glQX3CAD2jnMXLXDlTeOu-qJjIVxWBg376HQSrGb68Pg6T38de9UUYzQT2BlJxnL8MCFgOj3yh5d7WYwxwCO0Mx4Qos-ahW4wfkmeMP0BL3lVIKPg37r0X7__8-ICDZBqIrCsSEThNltMdI",
            online: false,
          },
        ]);
      }, 1000); // Simulate network delay
    });
  };

  React.useEffect(() => {
    fetchMessages().then(setMessages);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMessages().then((newMessages) => {
      setMessages(newMessages);
      setRefreshing(false);
    });
  };

  const filteredMessages = React.useMemo(() => {
    let filtered = messages;

    if (selectedTab === "Unread") {
      filtered = filtered.filter((msg) => msg.unreadCount > 0);
    }
    // Add logic for 'Groups' if applicable

    if (searchText) {
      const lowercasedSearchText = searchText.toLowerCase();
      filtered = filtered.filter(
        (msg) =>
          msg.name.toLowerCase().includes(lowercasedSearchText) ||
          msg.message.toLowerCase().includes(lowercasedSearchText),
      );
    }

    return filtered;
  }, [messages, selectedTab, searchText]);

  const Avatar = ({
    name,
    online,
    size = 56,
  }: {
    name: string;
    online: boolean;
    size?: number;
  }) => (
    <View style={[styles.avatarContainer, { width: size, height: size }]}>
      <View
        style={[
          styles.avatar,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
      >
        <Text style={[styles.avatarText, { fontSize: size * 0.4 }]}>
          {name.charAt(0)}
        </Text>
      </View>
      {online && (
        <View
          style={[
            styles.onlineIndicator,
            {
              width: size * 0.28,
              height: size * 0.28,
              borderRadius: size * 0.14,
            },
          ]}
        />
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>A</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chats</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconButton} activeOpacity={0.8}>
            <MaterialCommunityIcons
              name="camera"
              size={22}
              color={COLORS.text}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconButton, styles.primaryIconButton]}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="pencil" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBarContainer}>
        <MaterialCommunityIcons
          name="magnify"
          size={20}
          color={COLORS.textTertiary}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search messages..."
          placeholderTextColor={COLORS.textTertiary}
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Active Now Section */}
        <View style={styles.activeNowSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.activeUsersContent}
          >
            <TouchableOpacity style={styles.activeUserItem}>
              <View style={styles.createStoryContainer}>
                <MaterialCommunityIcons
                  name="plus"
                  size={24}
                  color={COLORS.text}
                />
              </View>
              <Text style={styles.activeUserName} numberOfLines={1}>
                Your Story
              </Text>
            </TouchableOpacity>
            {messages
              .filter((m) => m.online)
              .map((user) => (
                <TouchableOpacity
                  key={user.id}
                  style={styles.activeUserItem}
                  onPress={() =>
                    navigation.navigate("chat", {
                      userId: user.id,
                      name: user.name,
                    })
                  }
                >
                  <Avatar name={user.name} online={true} />
                  <TouchableOpacity
                    onPress={() =>
                      navigation.navigate("customerProfile", {
                        customerId: user.id,
                        name: user.name,
                        avatarUrl: user.avatarUrl,
                      })
                    }
                  >
                    <Text style={styles.activeUserName} numberOfLines={1}>
                      {user.name.split(" ")[0]}
                    </Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
          </ScrollView>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterTabs}>
          {(["All", "Unread", "Groups"] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setSelectedTab(tab)}
              style={[
                styles.filterTab,
                selectedTab === tab && styles.filterTabActive,
              ]}
            >
              <Text
                style={[
                  styles.filterTabText,
                  selectedTab === tab && styles.filterTabTextActive,
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Messages List */}
        <View style={styles.section}>
          {filteredMessages.length === 0 ? (
            <Text style={styles.noMessagesText}>No messages found.</Text>
          ) : (
            filteredMessages.map((msg) => (
              <TouchableOpacity
                key={msg.id}
                style={styles.messageItem}
                onPress={() =>
                  navigation.navigate("chat", {
                    userId: msg.id,
                    name: msg.name,
                  })
                }
              >
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate("customerProfile", {
                      customerId: msg.id,
                      name: msg.name,
                      avatarUrl: msg.avatarUrl,
                    })
                  }
                >
                  {/* Replaced inline avatar with Avatar component */}
                  <Avatar
                    name={msg.name}
                    online={msg.online}
                    avatarUrl={msg.avatarUrl}
                  />
                </TouchableOpacity>

                <View style={styles.messageContent}>
                  <View style={styles.messageHeader}>
                    <Text
                      style={[
                        styles.messageName,
                        msg.unreadCount > 0 && styles.messageNameUnread,
                      ]}
                    >
                      {msg.name}
                    </Text>
                  </View>
                  <View style={styles.messageFooter}>
                    <Text
                      style={[
                        styles.messageText,
                        msg.unreadCount > 0 && styles.messageTextUnread,
                      ]}
                      numberOfLines={1}
                    >
                      {msg.message}
                    </Text>
                    <Text style={styles.messageTime}> · {msg.time}</Text>
                  </View>
                </View>
                {msg.unreadCount > 0 && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000", // Set background to black
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerAvatarText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "700",
  },

  headerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },

  headerTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: COLORS.text,
  },

  headerActions: {
    flexDirection: "row",
    gap: 12,
    marginLeft: "auto",
  },

  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
  },

  primaryIconButton: {
    backgroundColor: COLORS.primary,
  },

  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 24,
    marginHorizontal: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
  },

  content: {
    flex: 1,
  },

  activeNowSection: {
    paddingVertical: 12,
  },
  activeUsersContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  activeUserItem: {
    alignItems: "center",
    width: 60,
    gap: 8,
  },
  createStoryContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
  },
  activeUserName: {
    color: COLORS.textSecondary,
    fontSize: 11,
    textAlign: "center",
  },

  filterTabs: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },

  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },

  filterTabActive: {
    backgroundColor: COLORS.primary,
  },

  filterTabText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textTertiary,
  },

  filterTabTextActive: {
    color: "white",
  },

  section: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },

  messageItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 16,
  },

  avatarContainer: {
    position: "relative",
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },

  avatarText: {
    fontSize: 22,
    fontWeight: "700",
    color: "white",
  },

  onlineIndicator: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.success,
    borderWidth: 3,
    borderColor: "#000000",
  },

  messageContent: {
    flex: 1,
  },

  messageHeader: {
    marginBottom: 2,
  },

  messageName: {
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.textSecondary,
  },
  messageNameUnread: {
    color: COLORS.text,
    fontWeight: "700",
  },

  messageFooter: {
    flexDirection: "row",
    alignItems: "center",
  },

  messageTime: {
    fontSize: 13,
    color: COLORS.textTertiary,
  },

  messageText: {
    fontSize: 14,
    color: COLORS.textTertiary,
    flexShrink: 1,
  },

  messageTextUnread: {
    color: COLORS.textSecondary,
    fontWeight: "700",
  },

  unreadDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
    marginLeft: 8,
  },
  noMessagesText: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
    color: COLORS.textTertiary,
  },
});
