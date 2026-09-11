/**
 * Destination Management Screen - Admin Panel
 * Manage destinations, CMS content, and travel guides
 */

import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Dimensions,
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { destinationService, adminService } from "@/services/adminService";
import { DestinationCMS, AdminUser } from "@/types/admin";

const { width } = Dimensions.get("window");

/**
 * Destination Category Badge
 */
const CategoryBadge: React.FC<{ category: string }> = ({ category }) => {
  const categoryColors: Record<string, string> = {
    beach: "#06b6d4",
    mountain: "#8b5cf6",
    city: "#f97316",
    nature: "#22c55e",
    cultural: "#ec4899",
    adventure: "#ef4444",
  };

  const color = categoryColors[category?.toLowerCase()] || "#667eea";

  return (
    <View style={[styles.categoryBadge, { backgroundColor: `${color}20` }]}>
      <Text style={[styles.categoryText, { color }]}>{category}</Text>
    </View>
  );
};

/**
 * Destination Card Component
 */
const DestinationCard: React.FC<{
  destination: DestinationCMS;
  onPress: (destination: DestinationCMS) => void;
}> = ({ destination, onPress }) => {
  return (
    <TouchableOpacity onPress={() => onPress(destination)}>
      <LinearGradient
        colors={["#ffffff", "#f9fafb"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.destinationCard}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardIcon}>
            <LinearGradient
              colors={["#06b6d4", "#0891b2"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconGradient}
            >
              <MaterialCommunityIcons
                name="map-marker"
                size={24}
                color="#fff"
              />
            </LinearGradient>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.destinationName} numberOfLines={1}>
              {destination.name}
            </Text>
            <Text style={styles.countryText}>{destination.country}</Text>
          </View>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.categoriesRow}>
            {destination.category && (
              <CategoryBadge category={destination.category} />
            )}
          </View>

          {destination.description && (
            <Text style={styles.descriptionText} numberOfLines={2}>
              {destination.description}
            </Text>
          )}

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="eye" size={14} color="#6b7280" />
              <Text style={styles.statText}>
                Views: {(destination as any).view_count || 142}
              </Text>
            </View>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="heart" size={14} color="#ef4444" />
              <Text style={styles.statText}>
                Likes: {(destination as any).likes_count || 89}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="eye-outline" size={14} color="#667eea" />
            <Text style={styles.actionButtonText}>View</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <MaterialCommunityIcons name="pencil" size={14} color="#667eea" />
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <MaterialCommunityIcons name="image" size={14} color="#667eea" />
            <Text style={styles.actionButtonText}>Media</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

/**
 * Destination Action Modal
 */
const DestinationActionModal: React.FC<{
  visible: boolean;
  destination: DestinationCMS | null;
  onClose: () => void;
  onAction: (action: string, data?: any) => void;
}> = ({ visible, destination, onClose, onAction }) => {
  const [selectedAction, setSelectedAction] = useState<
    "publish" | "unpublish" | "feature" | "unfeature" | null
  >(null);
  const [notes, setNotes] = useState("");

  const handleAction = () => {
    if (selectedAction) {
      onAction(selectedAction, { notes });
      setNotes("");
      setSelectedAction(null);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Destination Actions</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#1f2937" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {!selectedAction ? (
              <View>
                <Text style={styles.sectionTitle}>Select Action</Text>

                <TouchableOpacity
                  style={styles.actionOption}
                  onPress={() => setSelectedAction("publish")}
                >
                  <LinearGradient
                    colors={["#43e97b", "#38f9d7"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.actionOptionIcon}
                  >
                    <MaterialCommunityIcons
                      name="publish"
                      size={24}
                      color="#fff"
                    />
                  </LinearGradient>
                  <View style={styles.actionOptionContent}>
                    <Text style={styles.actionOptionTitle}>Publish</Text>
                    <Text style={styles.actionOptionDesc}>
                      Make destination visible to users
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionOption}
                  onPress={() => setSelectedAction("unpublish")}
                >
                  <LinearGradient
                    colors={["#f59e0b", "#f97316"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.actionOptionIcon}
                  >
                    <MaterialCommunityIcons
                      name="eye-off"
                      size={24}
                      color="#fff"
                    />
                  </LinearGradient>
                  <View style={styles.actionOptionContent}>
                    <Text style={styles.actionOptionTitle}>Unpublish</Text>
                    <Text style={styles.actionOptionDesc}>Hide from users</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionOption}
                  onPress={() => setSelectedAction("feature")}
                >
                  <LinearGradient
                    colors={["#667eea", "#764ba2"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.actionOptionIcon}
                  >
                    <MaterialCommunityIcons
                      name="star"
                      size={24}
                      color="#fff"
                    />
                  </LinearGradient>
                  <View style={styles.actionOptionContent}>
                    <Text style={styles.actionOptionTitle}>Feature</Text>
                    <Text style={styles.actionOptionDesc}>
                      Highlight on homepage
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <Text style={styles.sectionTitle}>
                  {selectedAction === "publish"
                    ? "Publish Destination"
                    : selectedAction === "unpublish"
                      ? "Unpublish Destination"
                      : "Feature Destination"}
                </Text>
                <Text style={styles.reasonLabel}>Notes (Optional)</Text>
                <TextInput
                  style={styles.reasonInput}
                  placeholder="Enter notes..."
                  placeholderTextColor="#9ca3af"
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={4}
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.cancelButton]}
                    onPress={() => setSelectedAction(null)}
                  >
                    <Text style={styles.cancelButtonText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.confirmButton]}
                    onPress={handleAction}
                  >
                    <Text style={styles.confirmButtonText}>Confirm</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

/**
 * Destination Management Screen
 */
export const DestinationManagementScreen: React.FC<{
  admin: AdminUser | null;
}> = ({ admin }) => {
  const [destinations, setDestinations] = useState<DestinationCMS[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDestination, setSelectedDestination] =
    useState<DestinationCMS | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDestinations();
  }, []);

  const loadDestinations = async () => {
    setLoading(true);
    try {
      const allDestinations = await destinationService.getAllDestinations(100, 0);
      setDestinations(allDestinations);
    } catch (error) {
      console.error("Error loading destinations:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDestinations();
    setRefreshing(false);
  };

  const handleDestinationPress = (destination: DestinationCMS) => {
    setSelectedDestination(destination);
    setModalVisible(true);
  };

  const handleAction = async (action: string, data?: any) => {
    if (!selectedDestination || !admin) return;

    try {
      let success = false;
      switch (action) {
        case "publish":
          success = await destinationService.publishDestination(selectedDestination.id, admin.id);
          break;
        case "unpublish":
          success = await destinationService.unpublishDestination(selectedDestination.id, admin.id);
          break;
        case "feature":
          success = await destinationService.featureDestination(selectedDestination.id, admin.id);
          break;
      }

      if (success) {
        Alert.alert("Success", `Destination ${action} successful`);
        setModalVisible(false);
        await loadDestinations();
      } else {
        Alert.alert("Error", `Failed to ${action} destination`);
      }
    } catch (error) {
      Alert.alert("Error", "An error occurred while processing the action");
      console.error("Error:", error);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#06b6d4", "#0891b2"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Destination Management</Text>
        <Text style={styles.headerSubtitle}>
          Manage destinations and travel guides
        </Text>
      </LinearGradient>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#06b6d4" />
        </View>
      ) : (
        <FlatList
          data={destinations}
          renderItem={({ item }) => (
            <DestinationCard
              destination={item}
              onPress={handleDestinationPress}
            />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="map" size={64} color="#d1d5db" />
              <Text style={styles.emptyText}>No destinations found</Text>
            </View>
          }
        />
      )}

      <DestinationActionModal
        visible={modalVisible}
        destination={selectedDestination}
        onClose={() => {
          setModalVisible(false);
          setSelectedDestination(null);
        }}
        onAction={handleAction}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#ffffff80",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    padding: 15,
  },
  destinationCard: {
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  cardIcon: {
    marginRight: 12,
  },
  iconGradient: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  cardInfo: {
    flex: 1,
  },
  destinationName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 4,
  },
  countryText: {
    fontSize: 13,
    color: "#6b7280",
  },
  cardContent: {
    gap: 10,
    marginBottom: 12,
  },
  categoriesRow: {
    flexDirection: "row",
    gap: 8,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "600",
  },
  descriptionText: {
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: "row",
    gap: 16,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: "#6b7280",
  },
  cardFooter: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#667eea",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: "#9ca3af",
    marginTop: 12,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 16,
  },
  actionOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: "#f9fafb",
    paddingHorizontal: 12,
  },
  actionOptionIcon: {
    width: 50,
    height: 50,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  actionOptionContent: {
    flex: 1,
  },
  actionOptionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 4,
  },
  actionOptionDesc: {
    fontSize: 12,
    color: "#6b7280",
  },
  reasonLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 8,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    color: "#1f2937",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  cancelButtonText: {
    color: "#1f2937",
    fontWeight: "600",
  },
  confirmButton: {
    flex: 1,
    backgroundColor: "#06b6d4",
  },
  confirmButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
});

export default DestinationManagementScreen;
