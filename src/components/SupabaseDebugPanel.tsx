import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  testSupabaseConnection,
  getSupabaseStatus,
} from "../utils/supabase-test";
import { SupabaseStatus } from "../hooks/useSupabaseStatus";

interface SupabaseDebugProps {
  visible?: boolean;
  onClose?: () => void;
}

/**
 * Supabase Debug Component
 * Shows connection status and test results
 */
export const SupabaseDebugPanel = ({
  visible = true,
  onClose,
}: SupabaseDebugProps) => {
  const [status, setStatus] = useState<SupabaseStatus | null>(null);
  const [testOutput, setTestOutput] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      checkStatus();
    }
  }, [visible]);

  const checkStatus = async () => {
    try {
      setLoading(true);
      const result = await getSupabaseStatus();
      setStatus(result);
    } catch (error) {
      console.error("Failed to check status:", error);
    } finally {
      setLoading(false);
    }
  };

  const runTests = async () => {
    try {
      setLoading(true);
      setTestOutput("Running tests...\n");

      // Capture console output
      const originalLog = console.log;
      const logs: string[] = [];
      console.log = (...args) => {
        logs.push(args.join(" "));
        originalLog(...args);
      };

      await testSupabaseConnection();

      console.log = originalLog;
      setTestOutput(logs.join("\n"));

      // Refresh status
      await checkStatus();
    } catch (error) {
      setTestOutput(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🔍 Supabase Connection Debug</Text>
        {onClose && (
          <Pressable onPress={onClose}>
            <Ionicons name="close" size={24} color="#333" />
          </Pressable>
        )}
      </View>

      <ScrollView style={styles.content}>
        {/* Status Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connection Status</Text>

          {status ? (
            <>
              <StatusRow label="Database Connected" value={status.connected} />
              <StatusRow label="Environment URL" value={status.url} />
              <StatusRow label="Environment Key" value={status.key} />
              <StatusRow label="Authenticated" value={status.authenticated} />

              {status.user && (
                <View style={styles.userInfo}>
                  <Text style={styles.label}>Logged in as:</Text>
                  <Text style={styles.value}>{status.user.email}</Text>
                  <Text style={styles.userId}>ID: {status.user.id}</Text>
                </View>
              )}

              {status.error && (
                <View style={styles.error}>
                  <Text style={styles.errorText}>Error: {status.error}</Text>
                </View>
              )}
            </>
          ) : (
            <Text style={styles.loadingText}>Loading...</Text>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <Pressable
            style={[styles.button, styles.checkButton, loading && { opacity: 0.5 }]}
            onPress={checkStatus}
            disabled={loading}
          >
            <Ionicons name="refresh" size={16} color="#fff" />
            <Text style={styles.buttonText}>Check Status</Text>
          </Pressable>

          <Pressable
            style={[styles.button, styles.testButton, loading && { opacity: 0.5 }]}
            onPress={runTests}
            disabled={loading}
          >
            <Ionicons name="play" size={16} color="#fff" />
            <Text style={styles.buttonText}>Run Tests</Text>
          </Pressable>
        </View>

        {/* Test Output */}
        {testOutput && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Test Output</Text>
            <View style={styles.output}>
              <Text style={styles.outputText}>{testOutput}</Text>
            </View>
          </View>
        )}

        {/* Configuration Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configuration</Text>

          <View style={styles.configItem}>
            <Text style={styles.label}>Supabase URL</Text>
            <Text style={styles.configValue}>
              {process.env.EXPO_PUBLIC_SUPABASE_URL
                ? process.env.EXPO_PUBLIC_SUPABASE_URL.substring(0, 35) + "..."
                : "NOT SET"}
            </Text>
          </View>

          <View style={styles.configItem}>
            <Text style={styles.label}>Supabase Key</Text>
            <Text style={styles.configValue}>
              {process.env.EXPO_PUBLIC_SUPABASE_KEY
                ? process.env.EXPO_PUBLIC_SUPABASE_KEY.substring(0, 20) + "..."
                : "NOT SET"}
            </Text>
          </View>
        </View>

        {/* Connection Indicators */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Health Indicators</Text>

          <HealthIndicator
            label="API Connectivity"
            status={status?.connected ? "healthy" : "error"}
          />
          <HealthIndicator
            label="Authentication"
            status={status?.authenticated ? "healthy" : "idle"}
          />
          <HealthIndicator
            label="Configuration"
            status={status?.url && status?.key ? "healthy" : "error"}
          />
        </View>
      </ScrollView>

      {loading && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingOverlayText}>Testing...</Text>
        </View>
      )}
    </View>
  );
};

interface StatusRowProps {
  label: string;
  value: boolean;
}

const StatusRow = ({ label, value }: StatusRowProps) => (
  <View style={styles.statusRow}>
    <View
      style={[
        styles.statusIndicator,
        value ? styles.statusGreen : styles.statusRed,
      ]}
    />
    <Text style={styles.statusLabel}>{label}</Text>
    <Text
      style={[styles.statusValue, value ? styles.statusOk : styles.statusError]}
    >
      {value ? "✅ OK" : "❌ FAILED"}
    </Text>
  </View>
);

interface HealthIndicatorProps {
  label: string;
  status: "healthy" | "idle" | "error";
}

const HealthIndicator = ({ label, status }: HealthIndicatorProps) => {
  const color = {
    healthy: "#10B981",
    idle: "#F59E0B",
    error: "#EF4444",
  }[status];

  const indicator = {
    healthy: "🟢",
    idle: "🟡",
    error: "🔴",
  }[status];

  return (
    <View style={styles.healthIndicator}>
      <Text style={styles.healthLabel}>
        {indicator} {label}
      </Text>
      <View style={[styles.healthBar, { backgroundColor: color }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "#287dfa",
    borderBottomWidth: 1,
    borderBottomColor: "#1e5cb8",
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
    color: "#333",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#287dfa",
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginEnd: 12,
  },
  statusGreen: {
    backgroundColor: "#10B981",
  },
  statusRed: {
    backgroundColor: "#EF4444",
  },
  statusLabel: {
    flex: 1,
    fontSize: 14,
    color: "#333",
  },
  statusValue: {
    fontSize: 12,
    fontWeight: "600",
  },
  statusOk: {
    color: "#10B981",
  },
  statusError: {
    color: "#EF4444",
  },
  userInfo: {
    backgroundColor: "#e0e7ff",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  label: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  value: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000666",
    marginBottom: 4,
  },
  userId: {
    fontSize: 12,
    color: "#666",
    fontFamily: "monospace",
  },
  error: {
    backgroundColor: "#fee2e2",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    color: "#dc2626",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  checkButton: {
    backgroundColor: "#287dfa",
  },
  testButton: {
    backgroundColor: "#10B981",
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    marginStart: 8,
  },
  output: {
    backgroundColor: "#1e1e1e",
    padding: 12,
    borderRadius: 8,
    minHeight: 120,
  },
  outputText: {
    fontSize: 12,
    color: "#10B981",
    fontFamily: "monospace",
  },
  configItem: {
    paddingVertical: 8,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  configValue: {
    fontSize: 12,
    color: "#666",
    fontFamily: "monospace",
    marginTop: 4,
  },
  healthIndicator: {
    marginBottom: 12,
  },
  healthLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#333",
    marginBottom: 6,
  },
  healthBar: {
    height: 4,
    borderRadius: 2,
  },
  loadingText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    paddingVertical: 16,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingOverlayText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
