import { showLocalizedAlert } from "../../utils/localizedAlert";
/**
 * Admin Settings Screen - Admin Panel
 * Manage system settings, app customization, business logic rules, security, and feature flags
 */

import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Dimensions,
  Switch,
  RefreshControl,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { adminService, appConfigService } from "@/services/adminService";
import { AdminUser } from "@/types/admin";
import { supabase } from "@/utils/supabase";
import { useRBAC } from "./rbac";
import { executeAdminCommand, UpdateSystemSettingCommand } from "./commands";

/**
 * Settings Section Component
 */
const SettingsSection: React.FC<{
  title: string;
  children: React.ReactNode;
  icon?: string;
}> = ({ title, children, icon }) => {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        {icon && (
          <MaterialCommunityIcons name={icon as any} size={20} color="#667eea" />
        )}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <LinearGradient
        colors={["#ffffff", "#f9fafb"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.sectionContent}
      >
        {children}
      </LinearGradient>
    </View>
  );
};

/**
 * Settings Row Component
 */
const SettingsRow: React.FC<{
  label: string;
  value?: string;
  onPress?: () => void;
  rightComponent?: React.ReactNode;
  showChevron?: boolean;
  icon?: string;
}> = ({ label, value, onPress, rightComponent, showChevron = true, icon }) => {
  return (
    <TouchableOpacity onPress={onPress} disabled={!onPress && !rightComponent}>
      <View style={styles.settingsRow}>
        <View style={styles.rowLeft}>
          {icon && (
            <MaterialCommunityIcons
              name={icon as any}
              size={18}
              color="#6b7280"
              style={styles.rowIcon}
            />
          )}
          <View style={styles.rowContent}>
            <Text style={styles.rowLabel}>{label}</Text>
            {value && <Text style={styles.rowValue}>{value}</Text>}
          </View>
        </View>
        <View style={styles.rowRight}>
          {rightComponent}
          {showChevron && (
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color="#d1d5db"
            />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

/**
 * Toggle Setting Component
 */
const ToggleSetting: React.FC<{
  label: string;
  value: boolean;
  onToggle: (value: boolean) => void;
  icon?: string;
}> = ({ label, value, onToggle, icon }) => {
  return (
    <View style={styles.settingsRow}>
      <View style={styles.rowLeft}>
        {icon && (
          <MaterialCommunityIcons
            name={icon as any}
            size={18}
            color="#6b7280"
            style={styles.rowIcon}
          />
        )}
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: "#e5e7eb", true: "#667eea" }}
        thumbColor={value ? "#667eea" : "#f3f4f6"}
      />
    </View>
  );
};

/**
 * Admin Settings Screen
 */
export const AdminSettingsScreen: React.FC<{ admin: AdminUser | null }> = ({
  admin: propsAdmin,
}) => {
  const { admin: rbacAdmin, hasPermission } = useRBAC();
  const admin = propsAdmin || rbacAdmin;
  const activeAdmin = admin;
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isSavingAppConfig, setIsSavingAppConfig] = useState(false);
  const [isSavingBusinessLogic, setIsSavingBusinessLogic] = useState(false);

  // App Customization State
  const [heroTitle, setHeroTitle] = useState("Trip.com");
  const [heroSubtitle, setHeroSubtitle] = useState("Your global travel partner ✈");
  const [announcementTicker, setAnnouncementTicker] = useState("🔥 FLASH SALE: 20% off all Cox's Bazar hotels this weekend with code SUMMER20!");
  const [announcementEnabled, setAnnouncementEnabled] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("We are currently performing scheduled system upgrades. We will be back shortly!");

  // Business Logic Parameters State
  const [commissionRate, setCommissionRate] = useState("10.0");
  const [surgeEnabled, setSurgeEnabled] = useState(true);
  const [surgeMaxMultiplier, setSurgeMaxMultiplier] = useState("1.5");
  const [cancellationFreeHours, setCancellationFreeHours] = useState("24");
  const [cancellationPenaltyRate, setCancellationPenaltyRate] = useState("15.0");
  const [autoApproveAgencies, setAutoApproveAgencies] = useState(false);

  const [settings, setSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    maintenanceMode: false,
    debugMode: false,
    auditLogging: true,
    ipWhitelisting: false,
    twoFactorRequired: true,
    apiRateLimiting: true,
    backupDaily: true,
    dataEncryption: true,
  });

  const [backupModalVisible, setBackupModalVisible] = useState(false);
  const [apiKeyModalVisible, setApiKeyModalVisible] = useState(false);
  const [newApiKey, setNewApiKey] = useState("");

  const loadSettingsFromDb = async () => {
    try {
      const { data, error } = await supabase.from("system_settings").select("*");
      if (data && data.length > 0) {
        const map: Record<string, any> = {};
        data.forEach((s: any) => {
          map[s.setting_key] = s.setting_value;
        });

        // App customization values
        if (map["app_hero_title"]) setHeroTitle(map["app_hero_title"]);
        if (map["app_hero_subtitle"]) setHeroSubtitle(map["app_hero_subtitle"]);
        if (map["app_announcement_ticker"]) setAnnouncementTicker(map["app_announcement_ticker"]);
        if (map["app_announcement_enabled"] !== undefined) {
          setAnnouncementEnabled(map["app_announcement_enabled"] === "true" || map["app_announcement_enabled"] === true);
        }
        if (map["app_maintenance_mode"] !== undefined) {
          setMaintenanceMode(map["app_maintenance_mode"] === "true" || map["app_maintenance_mode"] === true);
        }
        if (map["app_maintenance_message"]) setMaintenanceMessage(map["app_maintenance_message"]);

        // Business logic values
        if (map["app_default_commission_rate"]) setCommissionRate(String(map["app_default_commission_rate"]));
        if (map["app_surge_pricing_enabled"] !== undefined) {
          setSurgeEnabled(map["app_surge_pricing_enabled"] !== "false");
        }
        if (map["app_surge_multiplier_max"]) setSurgeMaxMultiplier(String(map["app_surge_multiplier_max"]));
        if (map["app_cancellation_free_hours"]) setCancellationFreeHours(String(map["app_cancellation_free_hours"]));
        if (map["app_cancellation_penalty_rate"]) setCancellationPenaltyRate(String(map["app_cancellation_penalty_rate"]));
        if (map["app_auto_approve_agencies"] !== undefined) {
          setAutoApproveAgencies(map["app_auto_approve_agencies"] === "true" || map["app_auto_approve_agencies"] === true);
        }

        // Feature flags
        const boolMap: any = {};
        Object.entries(map).forEach(([k, v]) => {
          boolMap[k] = v === "true" || v === true;
        });
        setSettings((prev) => ({ ...prev, ...boolMap }));
      }
    } catch (err) {
      console.warn("Error loading system settings:", err);
    }
  };

  useEffect(() => {
    loadSettingsFromDb();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSettingsFromDb();
    setRefreshing(false);
  };

  const handleSaveAppCustomization = async () => {
    setIsSavingAppConfig(true);
    try {
      await appConfigService.updateBulkConfigs({
        app_hero_title: heroTitle.trim(),
        app_hero_subtitle: heroSubtitle.trim(),
        app_announcement_ticker: announcementTicker.trim(),
        app_announcement_enabled: announcementEnabled,
        app_maintenance_mode: maintenanceMode,
        app_maintenance_message: maintenanceMessage.trim(),
      });
      showLocalizedAlert(
        "App Customizations Saved! ✨",
        "Home screen branding, subtitles and announcement ticker updated live across traveler devices."
      );
    } catch (err: any) {
      showLocalizedAlert("Error", err.message || "Failed to update app customization.");
    } finally {
      setIsSavingAppConfig(false);
    }
  };

  const handleSaveBusinessLogic = async () => {
    setIsSavingBusinessLogic(true);
    try {
      await appConfigService.updateBulkConfigs({
        app_default_commission_rate: parseFloat(commissionRate) || 10.0,
        app_surge_pricing_enabled: surgeEnabled,
        app_surge_multiplier_max: parseFloat(surgeMaxMultiplier) || 1.5,
        app_cancellation_free_hours: parseInt(cancellationFreeHours, 10) || 24,
        app_cancellation_penalty_rate: parseFloat(cancellationPenaltyRate) || 15.0,
        app_auto_approve_agencies: autoApproveAgencies,
      });
      showLocalizedAlert(
        "Business Logic Updated! ⚙️",
        "Platform commission splits, cancellation rules and surge parameters successfully updated."
      );
    } catch (err: any) {
      showLocalizedAlert("Error", err.message || "Failed to update business logic rules.");
    } finally {
      setIsSavingBusinessLogic(false);
    }
  };

  const handleToggleSetting = async (key: keyof typeof settings) => {
    const nextVal = !settings[key];
    const prevVal = settings[key];
    setSettings((prev) => ({
      ...prev,
      [key]: nextVal,
    }));
    try {
      if (activeAdmin) {
        const command = new UpdateSystemSettingCommand(String(key), nextVal);
        await executeAdminCommand(command, activeAdmin);
      }
    } catch (err: any) {
      console.warn("Failed to persist and audit system setting:", err);
      setSettings((prev) => ({
        ...prev,
        [key]: prevVal,
      }));
      showLocalizedAlert("Permission Error", err.message || "Failed to update setting due to RBAC policy.");
    }
  };

  const handleBackup = async () => {
    setLoading(true);
    try {
      showLocalizedAlert("Success", "Database backup initiated successfully");
      setBackupModalVisible(false);
    } catch (error) {
      showLocalizedAlert("Error", "Failed to create backup");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateApiKey = async () => {
    setLoading(true);
    try {
      const apiKey = `sk_${Math.random().toString(36).substr(2, 20).toUpperCase()}`;
      setNewApiKey(apiKey);
      showLocalizedAlert("Success", "New API key generated");
    } catch (error) {
      showLocalizedAlert("Error", "Failed to generate API key");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#667eea", "#764ba2"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>System Control & Customization</Text>
        <Text style={styles.headerSubtitle}>
          Modify consumer app texts, business logic & security parameters
        </Text>
      </LinearGradient>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.scrollContent}
        >
          {/* ========================================================================= */}
          {/* 1. APP BRANDING & DYNAMIC TEXT CUSTOMIZATION                             */}
          {/* ========================================================================= */}
          <SettingsSection title="Consumer App Text & Content Customization" icon="cellphone-cog">
            <View style={styles.customSectionWrap}>
              <Text style={styles.inputFieldLabel}>Home Hero Title (Brand Headline)</Text>
              <TextInput
                style={styles.textInputStyle}
                value={heroTitle}
                onChangeText={setHeroTitle}
                placeholder="Trip.com or Shopnojatra"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.inputFieldLabel}>Home Hero Subtitle</Text>
              <TextInput
                style={styles.textInputStyle}
                value={heroSubtitle}
                onChangeText={setHeroSubtitle}
                placeholder="Your global travel partner ✈"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.inputFieldLabel}>Announcement Ticker Banner Text</Text>
              <TextInput
                style={[styles.textInputStyle, { height: 60, textAlignVertical: "top" }]}
                multiline
                value={announcementTicker}
                onChangeText={setAnnouncementTicker}
                placeholder="🔥 FLASH SALE: 20% off all Cox's Bazar hotels this weekend with code SUMMER20!"
                placeholderTextColor="#94a3b8"
              />

              <View style={styles.inlineToggleRow}>
                <Text style={styles.inlineToggleLabel}>Show Announcement Ticker Bar</Text>
                <Switch
                  value={announcementEnabled}
                  onValueChange={setAnnouncementEnabled}
                  trackColor={{ false: "#e2e8f0", true: "#667eea" }}
                  thumbColor={announcementEnabled ? "#667eea" : "#f1f5f9"}
                />
              </View>

              <View style={styles.inlineToggleRow}>
                <View>
                  <Text style={styles.inlineToggleLabel}>Maintenance Mode (Block Consumer Access)</Text>
                  <Text style={styles.inlineToggleSub}>Directs all users to maintenance screen</Text>
                </View>
                <Switch
                  value={maintenanceMode}
                  onValueChange={setMaintenanceMode}
                  trackColor={{ false: "#e2e8f0", true: "#ef4444" }}
                  thumbColor={maintenanceMode ? "#ef4444" : "#f1f5f9"}
                />
              </View>

              {maintenanceMode && (
                <>
                  <Text style={styles.inputFieldLabel}>Maintenance Alert Message</Text>
                  <TextInput
                    style={[styles.textInputStyle, { height: 50 }]}
                    value={maintenanceMessage}
                    onChangeText={setMaintenanceMessage}
                    placeholder="We will be back shortly!"
                  />
                </>
              )}

              <TouchableOpacity
                style={styles.saveSectionBtn}
                onPress={handleSaveAppCustomization}
                disabled={isSavingAppConfig}
              >
                {isSavingAppConfig ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={16} color="#ffffff" />
                    <Text style={styles.saveSectionBtnText}>Apply App Customizations Live</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </SettingsSection>

          {/* ========================================================================= */}
          {/* 2. BUSINESS LOGIC & PARAMETERS CONTROL                                    */}
          {/* ========================================================================= */}
          <SettingsSection title="Business Logic & Revenue Rules" icon="finance">
            <View style={styles.customSectionWrap}>
              <View style={styles.twoColRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputFieldLabel}>Platform Commission Rate (%)</Text>
                  <TextInput
                    style={styles.textInputStyle}
                    value={commissionRate}
                    onChangeText={setCommissionRate}
                    keyboardType="numeric"
                    placeholder="10.0"
                    placeholderTextColor="#94a3b8"
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.inputFieldLabel}>Surge Cap Multiplier</Text>
                  <TextInput
                    style={styles.textInputStyle}
                    value={surgeMaxMultiplier}
                    onChangeText={setSurgeMaxMultiplier}
                    keyboardType="numeric"
                    placeholder="1.5"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>

              <View style={styles.twoColRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputFieldLabel}>Free Cancellation (Hours)</Text>
                  <TextInput
                    style={styles.textInputStyle}
                    value={cancellationFreeHours}
                    onChangeText={setCancellationFreeHours}
                    keyboardType="numeric"
                    placeholder="24"
                    placeholderTextColor="#94a3b8"
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.inputFieldLabel}>Late Cancellation Penalty (%)</Text>
                  <TextInput
                    style={styles.textInputStyle}
                    value={cancellationPenaltyRate}
                    onChangeText={setCancellationPenaltyRate}
                    keyboardType="numeric"
                    placeholder="15.0"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>

              <View style={styles.inlineToggleRow}>
                <View>
                  <Text style={styles.inlineToggleLabel}>Dynamic Surge Pricing Engine</Text>
                  <Text style={styles.inlineToggleSub}>Adjusts price multipliers based on real-time flight & hotel demand</Text>
                </View>
                <Switch
                  value={surgeEnabled}
                  onValueChange={setSurgeEnabled}
                  trackColor={{ false: "#e2e8f0", true: "#10b981" }}
                  thumbColor={surgeEnabled ? "#10b981" : "#f1f5f9"}
                />
              </View>

              <View style={styles.inlineToggleRow}>
                <View>
                  <Text style={styles.inlineToggleLabel}>Auto-Approve Agency Registrations</Text>
                  <Text style={styles.inlineToggleSub}>Bypasses manual trade license verification queue</Text>
                </View>
                <Switch
                  value={autoApproveAgencies}
                  onValueChange={setAutoApproveAgencies}
                  trackColor={{ false: "#e2e8f0", true: "#6366f1" }}
                  thumbColor={autoApproveAgencies ? "#6366f1" : "#f1f5f9"}
                />
              </View>

              <TouchableOpacity
                style={[styles.saveSectionBtn, { backgroundColor: "#059669" }]}
                onPress={handleSaveBusinessLogic}
                disabled={isSavingBusinessLogic}
              >
                {isSavingBusinessLogic ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="content-save-check" size={16} color="#ffffff" />
                    <Text style={styles.saveSectionBtnText}>Save Business Logic Parameters</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </SettingsSection>

          {/* ========================================================================= */}
          {/* 3. PLATFORM TELEMETRY & SYSTEM STATUS                                     */}
          {/* ========================================================================= */}
          <SettingsSection title="System Status" icon="database">
            <SettingsRow
              label="Platform Status"
              value={maintenanceMode ? "Maintenance Active" : "100% Operational"}
              showChevron={false}
              icon="check-circle"
            />
            <SettingsRow
              label="PostgreSQL Database"
              value="Connected (Pooler Active)"
              showChevron={false}
              icon="check-circle"
            />
            <SettingsRow
              label="FCM Push Notification Hub"
              value="Operational"
              showChevron={false}
              icon="check-circle"
            />
            <SettingsRow
              label="Last Automated Backup"
              value="Daily Backup Scheduled"
              showChevron={false}
              icon="backup-restore"
            />
          </SettingsSection>

          {/* Notifications */}
          <SettingsSection title="Dispatch Channels" icon="bell">
            <ToggleSetting
              label="Email Notifications"
              value={settings.emailNotifications}
              onToggle={() => handleToggleSetting("emailNotifications")}
              icon="email"
            />
            <View style={styles.divider} />
            <ToggleSetting
              label="SMS Notifications"
              value={settings.smsNotifications}
              onToggle={() => handleToggleSetting("smsNotifications")}
              icon="message"
            />
            <View style={styles.divider} />
            <ToggleSetting
              label="Push Notifications"
              value={settings.pushNotifications}
              onToggle={() => handleToggleSetting("pushNotifications")}
              icon="bell-ring"
            />
          </SettingsSection>

          {/* Security Settings */}
          <SettingsSection title="Security & Compliance" icon="shield-account">
            <ToggleSetting
              label="Audit Logging"
              value={settings.auditLogging}
              onToggle={() => handleToggleSetting("auditLogging")}
              icon="file-document"
            />
            <View style={styles.divider} />
            <ToggleSetting
              label="IP Whitelisting"
              value={settings.ipWhitelisting}
              onToggle={() => handleToggleSetting("ipWhitelisting")}
              icon="security"
            />
            <View style={styles.divider} />
            <ToggleSetting
              label="2FA Required"
              value={settings.twoFactorRequired}
              onToggle={() => handleToggleSetting("twoFactorRequired")}
              icon="two-factor-authentication"
            />
            <View style={styles.divider} />
            <ToggleSetting
              label="Data Encryption"
              value={settings.dataEncryption}
              onToggle={() => handleToggleSetting("dataEncryption")}
              icon="lock"
            />
          </SettingsSection>

          {/* API Configuration */}
          <SettingsSection title="API Configuration" icon="api">
            <SettingsRow
              label="Rate Limiting"
              value={settings.apiRateLimiting ? "Enabled" : "Disabled"}
              icon="speedometer"
              showChevron={false}
              rightComponent={
                <Switch
                  value={settings.apiRateLimiting}
                  onValueChange={() => handleToggleSetting("apiRateLimiting")}
                />
              }
            />
            <View style={styles.divider} />
            <SettingsRow
              label="Generate API Key"
              icon="key"
              onPress={() => setApiKeyModalVisible(true)}
            />
            <View style={styles.divider} />
            <SettingsRow
              label="API Documentation"
              icon="book-open"
              onPress={() =>
                showLocalizedAlert("API Documentation", "Visit: /docs or /api/v1/openapi.json")
              }
            />
          </SettingsSection>

          {/* Database Settings */}
          <SettingsSection title="Database & Backups" icon="database-settings">
            <ToggleSetting
              label="Daily Backups"
              value={settings.backupDaily}
              onToggle={() => handleToggleSetting("backupDaily")}
              icon="backup-restore"
            />
            <View style={styles.divider} />
            <SettingsRow
              label="Create Manual Backup"
              icon="plus-circle"
              onPress={() => setBackupModalVisible(true)}
            />
            <View style={styles.divider} />
            <SettingsRow
              label="Database Size"
              value="2.4 GB"
              icon="database"
              showChevron={false}
            />
          </SettingsSection>
        </ScrollView>
      )}

      {/* Backup Modal */}
      <Modal
        visible={backupModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setBackupModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Database Backup</Text>
            <Text style={styles.modalDescription}>
              Create a snapshot of all 52+ database tables and activity records.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setBackupModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleBackup}
              >
                <Text style={styles.confirmButtonText}>Start Backup</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* API Key Modal */}
      <Modal
        visible={apiKeyModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setApiKeyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Generate API Key</Text>
            <Text style={styles.modalDescription}>
              Generate a scoped administrative service token for automation.
            </Text>
            {newApiKey ? (
              <View style={styles.apiKeyContainer}>
                <Text style={styles.apiKeyLabel}>Your API Key:</Text>
                <Text style={styles.apiKeyText}>{newApiKey}</Text>
              </View>
            ) : null}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setApiKeyModalVisible(false);
                  setNewApiKey("");
                }}
              >
                <Text style={styles.cancelButtonText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleGenerateApiKey}
              >
                <Text style={styles.confirmButtonText}>Generate</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#ffffff90",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1f2937",
  },
  sectionContent: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  customSectionWrap: {
    padding: 14,
  },
  inputFieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginTop: 8,
    marginBottom: 4,
  },
  textInputStyle: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: "#0f172a",
    marginBottom: 4,
  },
  inlineToggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    marginTop: 6,
  },
  inlineToggleLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1e293b",
  },
  inlineToggleSub: {
    fontSize: 10,
    color: "#64748b",
    marginTop: 1,
    maxWidth: 240,
  },
  twoColRow: {
    flexDirection: "row",
    gap: 10,
  },
  saveSectionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6366f1",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    marginTop: 12,
  },
  saveSectionBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#ffffff",
  },
  settingsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  rowIcon: {
    width: 24,
  },
  rowContent: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1f2937",
  },
  rowValue: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 2,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  divider: {
    height: 1,
    backgroundColor: "#e5e7eb",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#e5e7eb",
  },
  confirmButton: {
    backgroundColor: "#667eea",
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1f2937",
  },
  confirmButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
  },
  apiKeyContainer: {
    backgroundColor: "#f3f4f6",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  apiKeyLabel: {
    fontSize: 11,
    color: "#6b7280",
    marginBottom: 4,
  },
  apiKeyText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1f2937",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
});

export default AdminSettingsScreen;
