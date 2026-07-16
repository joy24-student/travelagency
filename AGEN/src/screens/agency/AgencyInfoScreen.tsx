/**
 * Agency Info Screen
 * Agency profile management and details
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { COLORS } from "../../App";
import { agencyProfileService } from "../../services/agencyService";

const { width } = Dimensions.get("window");

// Ultra UI Constants from HTML redesign
const UI_COLORS = {
  background: "#0b1326",
  primary: "#c3c0ff",
  secondary: "#4cd7f6",
  surfaceContainer: "#171f33",
  surfaceHighest: "#2d3449",
  text: "#dae2fd",
  textVariant: "#c7c4d7",
  outline: "#918fa0",
  primaryContainer: "#4338ca",
  onPrimaryContainer: "#c1beff",
  glassBg: "rgba(255, 255, 255, 0.04)",
  glassBorder: "rgba(255, 255, 255, 0.12)",
  error: "#ffb4ab",
};

export default function AgencyInfoScreen({ navigation }: any) {
  const [agencyId] = useState("GTL-8821");
  const [formData, setFormData] = useState({
    name: "Global Travels Ltd.",
    email: "contact@globaltravels.com",
    phone: "+1 234 567 8900",
    website: "www.globaltravels.com",
    description: "Premium luxury travel solutions for discerning travelers",
    address: "123 Travel Street, New York, NY 10001",
    logoUrl: null as string | null,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      await agencyProfileService.updateProfile(agencyId, formData);
      Alert.alert("Success", "Agency information updated successfully");
      navigation.goBack();
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to save",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={["rgba(19, 27, 46, 0.8)", "transparent"]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={styles.headerLogoBox}>
              <MaterialIcons
                name="travel-explore"
                size={20}
                color={UI_COLORS.onPrimaryContainer}
              />
            </View>
            <Text style={styles.headerTitle}>ShopnoJatra Ultra</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerIconBtn}>
              <MaterialIcons
                name="search"
                size={22}
                color={UI_COLORS.primary}
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerIconBtn}>
              <MaterialIcons
                name="smart-toy"
                size={22}
                color={UI_COLORS.primary}
              />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Section / Cover */}
        <View style={styles.heroSection}>
          <Image
            source={{
              uri: "https://lh3.googleusercontent.com/aida-public/AB6AXuC9i2arsElPnSuXxBaJJKj6B3UYV8qYmcM68hNLpl0Iy9MdykSGe-KHixmlzipXjqy4qAl1wqzRQqfW7zoNlwxXhAr2EpA4FaDVD5dSe7Qw9z7u6jHGN5M2lha5U0z1IdFFDQcqZxq_1YG60YR1eQ6C2lJYLud-FJtUYndfk2RSfizvTcTdH-YzppPxTktKFSxYjtWBGbrzc4pTFUnFx8AcH01B7ozerdQz0c-yxhAKvBXHDJx4qWhSVNKc1Kun5QqTiO1OeSwoJs4",
            }}
            style={styles.coverImage}
          />
          <LinearGradient
            colors={["transparent", UI_COLORS.background]}
            style={styles.heroOverlay}
          />

          <View style={styles.heroIdentity}>
            <View style={styles.logoContainer}>
              <View style={styles.logoFrame}>
                {formData.logoUrl ? (
                  <Image
                    source={{ uri: formData.logoUrl }}
                    style={styles.fullLogo}
                  />
                ) : (
                  <MaterialIcons
                    name="business"
                    size={40}
                    color={UI_COLORS.primary}
                  />
                )}
              </View>
              <View style={styles.verifiedBadge}>
                <MaterialIcons
                  name="verified"
                  size={14}
                  color={UI_COLORS.background}
                />
              </View>
            </View>

            <View style={styles.identityText}>
              <Text style={styles.agencyName}>{formData.name}</Text>
              <View style={styles.locationRow}>
                <MaterialIcons
                  name="location-on"
                  size={14}
                  color={UI_COLORS.primary}
                />
                <Text style={styles.descriptionText}>
                  Premium Enterprise Luxury Travel Solutions
                </Text>
              </View>
              <View style={styles.tagRow}>
                <View style={styles.statusTag}>
                  <Text style={styles.statusTagText}>Verified Agency</Text>
                </View>
                <View style={[styles.statusTag, styles.eliteTag]}>
                  <Text
                    style={[
                      styles.statusTagText,
                      { color: UI_COLORS.secondary },
                    ]}
                  >
                    Elite Partner
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Business Details Form */}
        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>Business Identity</Text>

          <View style={styles.glassCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Legal Business Name</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) =>
                  setFormData({ ...formData, name: text })
                }
                placeholderTextColor={UI_COLORS.outline}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Corporate Email</Text>
              <TextInput
                style={styles.input}
                value={formData.email}
                onChangeText={(text) =>
                  setFormData({ ...formData, email: text })
                }
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Global Contact Phone</Text>
              <TextInput
                style={styles.input}
                value={formData.phone}
                onChangeText={(text) =>
                  setFormData({ ...formData, phone: text })
                }
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Official Website</Text>
              <TextInput
                style={styles.input}
                value={formData.website}
                onChangeText={(text) =>
                  setFormData({ ...formData, website: text })
                }
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Headquarters Address</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                value={formData.address}
                onChangeText={(text) =>
                  setFormData({ ...formData, address: text })
                }
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Brand Description</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                value={formData.description}
                onChangeText={(text) =>
                  setFormData({ ...formData, description: text })
                }
                multiline
                numberOfLines={4}
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            disabled={saving}
          >
            <LinearGradient
              colors={[UI_COLORS.primary, UI_COLORS.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveGradient}
            >
              {saving ? (
                <ActivityIndicator color={UI_COLORS.background} />
              ) : (
                <>
                  <MaterialIcons
                    name="cloud-upload"
                    size={20}
                    color={UI_COLORS.background}
                  />
                  <Text style={styles.saveButtonText}>
                    Update Business Identity
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <Text style={styles.versionText}>
          Version 2.1.0 • {formData.name} Enterprise ID: {agencyId}
        </Text>
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: UI_COLORS.background },
  header: {
    position: "absolute",
    top: 0,
    width: "100%",
    zIndex: 100,
    height: 80,
    justifyContent: "center",
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerLogoBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: UI_COLORS.primaryContainer,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: UI_COLORS.primary,
    letterSpacing: -0.5,
  },
  headerActions: { flexDirection: "row", gap: 12 },
  headerIconBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  content: { flex: 1 },
  heroSection: { height: 340, width: "100%", overflow: "hidden" },
  coverImage: { ...StyleSheet.absoluteFillObject, opacity: 0.5 },
  heroOverlay: { ...StyleSheet.absoluteFillObject },
  heroIdentity: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 16,
  },
  logoContainer: { position: "relative" },
  logoFrame: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: UI_COLORS.surfaceContainer,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  fullLogo: { width: "100%", height: "100%" },
  verifiedBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    backgroundColor: UI_COLORS.secondary,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: UI_COLORS.background,
  },
  identityText: { flex: 1, gap: 4 },
  agencyName: {
    fontSize: 24,
    fontWeight: "800",
    color: "white",
  },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  descriptionText: {
    fontSize: 13,
    color: UI_COLORS.textVariant,
  },
  tagRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  statusTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    backgroundColor: "rgba(67, 56, 202, 0.3)",
    borderWidth: 1,
    borderColor: "rgba(195, 192, 255, 0.2)",
  },
  statusTagText: {
    fontSize: 10,
    fontWeight: "700",
    color: UI_COLORS.primary,
  },
  eliteTag: {
    backgroundColor: "rgba(3, 181, 211, 0.2)",
    borderColor: "rgba(76, 215, 246, 0.2)",
  },
  formContainer: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "white",
    marginBottom: 16,
  },
  glassCard: {
    backgroundColor: UI_COLORS.glassBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: UI_COLORS.glassBorder,
    padding: 20,
    gap: 20,
  },
  inputGroup: { gap: 8 },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: UI_COLORS.outline,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.02)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: "white",
    fontSize: 15,
  },
  multilineInput: {
    textAlignVertical: "top",
    minHeight: 80,
  },
  saveButton: {
    marginTop: 32,
    borderRadius: 100,
    overflow: "hidden",
    elevation: 8,
    shadowColor: UI_COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  saveGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: UI_COLORS.background,
  },
  versionText: {
    textAlign: "center",
    color: UI_COLORS.outline,
    fontSize: 11,
    marginTop: 32,
  },
});
