/**
 * AGEN Platform Monitoring - Admin Analytics Dashboard
 * Real-time platform health, metrics, and performance tracking
 * Comprehensive oversight of all AGEN agencies
 */

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  MaterialCommunityIcons,
  FontAwesome5,
  Ionicons,
} from "@expo/vector-icons";
import { supabase } from "@/utils/supabase";

const { width } = Dimensions.get("window");

interface PlatformMetrics {
  total_agencies: number;
  active_agencies: number;
  verified_agencies: number;
  total_bookings: number;
  total_revenue: number;
  average_agency_rating: number;
  pending_verifications: number;
  critical_alerts: number;
}

/**
 * Metric Card Component
 */
const MetricCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  color: string;
  trend?: number;
}> = ({ title, value, subtitle, icon, color, trend }) => (
  <LinearGradient
    colors={[`${color}10`, `${color}05`]}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={styles.metricCard}
  >
    <View style={styles.metricHeader}>
      <View
        style={[
          styles.metricIcon,
          {
            backgroundColor: `${color}20`,
          },
        ]}
      >
        <MaterialCommunityIcons name={icon as any} size={24} color={color} />
      </View>
      {trend !== undefined && (
        <View
          style={[
            styles.trendBadge,
            { backgroundColor: trend > 0 ? "#10b98120" : "#ef444420" },
          ]}
        >
          <MaterialCommunityIcons
            name={trend > 0 ? "trending-up" : "trending-down"}
            size={14}
            color={trend > 0 ? "#10b981" : "#ef4444"}
          />
          <Text
            style={{
              color: trend > 0 ? "#10b981" : "#ef4444",
              fontSize: 11,
              fontWeight: "600",
            }}
          >
            {Math.abs(trend)}%
          </Text>
        </View>
      )}
    </View>

    <View style={styles.metricContent}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricTitle}>{title}</Text>
      {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
    </View>
  </LinearGradient>
);

/**
 * Status Indicator
 */
const StatusIndicator: React.FC<{ status: string; count: number }> = ({
  status,
  count,
}) => {
  const colors: Record<string, { color: string; bg: string }> = {
    active: { color: "#10b981", bg: "#10b98110" },
    verified: { color: "#667eea", bg: "#667eea10" },
    pending: { color: "#f59e0b", bg: "#f59e0b10" },
    suspended: { color: "#ef4444", bg: "#ef444410" },
  };

  const cfg = colors[status] || colors.pending;

  return (
    <View style={[styles.statusIndicator, { backgroundColor: cfg.bg }]}>
      <View
        style={[
          styles.statusDot,
          {
            backgroundColor: cfg.color,
          },
        ]}
      />
      <View style={styles.statusInfo}>
        <Text style={styles.statusLabel}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Text>
        <Text style={[styles.statusCount, { color: cfg.color }]}>{count}</Text>
      </View>
    </View>
  );
};

/**
 * Alert Item
 */
const AlertItem: React.FC<{
  title: string;
  message: string;
  severity: string;
  timestamp: string;
}> = ({ title, message, severity, timestamp }) => {
  const severityColors: Record<string, string> = {
    critical: "#ef4444",
    high: "#f59e0b",
    medium: "#f59e0b",
    low: "#667eea",
  };

  return (
    <View style={styles.alertItem}>
      <View
        style={[
          styles.alertIndicator,
          { backgroundColor: severityColors[severity] },
        ]}
      />
      <View style={styles.alertContent}>
        <Text style={styles.alertTitle}>{title}</Text>
        <Text style={styles.alertMessage} numberOfLines={2}>
          {message}
        </Text>
        <Text style={styles.alertTime}>{timestamp}</Text>
      </View>
    </View>
  );
};

/**
 * Main Component
 */
export default function AgenPlatformMonitoringScreen() {
  const [metrics, setMetrics] = useState<PlatformMetrics>({
    total_agencies: 0,
    active_agencies: 0,
    verified_agencies: 0,
    total_bookings: 0,
    total_revenue: 0,
    average_agency_rating: 0,
    pending_verifications: 0,
    critical_alerts: 0,
  });

  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadMetrics = async () => {
    try {
      // Get agencies data
      const { data: agencies } = await supabase
        .from("agencies")
        .select("id, status, verification_status, rating");

      // Get bookings data
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, final_price");

      // Get alerts
      const { data: adminAlerts } = await supabase
        .from("admin_alerts")
        .select("*")
        .eq("source", "agency_portal")
        .order("created_at", { ascending: false })
        .limit(10);

      const agenciesArray = agencies || [];
      const bookingsArray = bookings || [];

      const totalRevenue = bookingsArray.reduce(
        (sum, b) => sum + Number(b.final_price || 0),
        0,
      );

      const avgRating =
        agenciesArray.length > 0
          ? agenciesArray.reduce((sum, a) => sum + (a.rating || 0), 0) /
            agenciesArray.length
          : 0;

      setMetrics({
        total_agencies: agenciesArray.length,
        active_agencies: agenciesArray.filter(
          (a: any) => a.status === "active",
        ).length,
        verified_agencies: agenciesArray.filter(
          (a: any) => a.verification_status === "verified",
        ).length,
        total_bookings: bookingsArray.length,
        total_revenue: Math.round(totalRevenue),
        average_agency_rating: Math.round(avgRating * 10) / 10,
        pending_verifications: agenciesArray.filter(
          (a: any) => a.verification_status === "pending",
        ).length,
        critical_alerts: (adminAlerts || []).filter(
          (a: any) => a.severity === "critical",
        ).length,
      });

      setAlerts(adminAlerts || []);
    } catch (error) {
      console.error("Error loading metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMetrics();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <LinearGradient
        colors={["#667eea", "#764ba2"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Platform Monitor</Text>
          <Text style={styles.headerSubtitle}>
            Real-time AGEN Network Health
          </Text>
        </View>

        {metrics.critical_alerts > 0 && (
          <View style={styles.alertBanner}>
            <MaterialCommunityIcons name="alert" size={20} color="#fff" />
            <Text style={styles.alertBannerText}>
              {metrics.critical_alerts} Critical Alert
              {metrics.critical_alerts > 1 ? "s" : ""}
            </Text>
          </View>
        )}
      </LinearGradient>

      {/* Key Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Platform Metrics</Text>

        <View style={styles.metricsGrid}>
          <MetricCard
            title="Total Agencies"
            value={metrics.total_agencies}
            icon="store"
            color="#667eea"
          />
          <MetricCard
            title="Active Agencies"
            value={metrics.active_agencies}
            subtitle={`${Math.round((metrics.active_agencies / Math.max(metrics.total_agencies, 1)) * 100)}% active`}
            icon="check-circle"
            color="#10b981"
          />
          <MetricCard
            title="Total Bookings"
            value={metrics.total_bookings}
            icon="clipboard-list"
            color="#3b82f6"
          />
          <MetricCard
            title="Total Revenue"
            value={`$${(metrics.total_revenue / 1000).toFixed(0)}K`}
            subtitle="Gross revenue"
            icon="currency-usd"
            color="#f59e0b"
          />
          <MetricCard
            title="Avg Rating"
            value={metrics.average_agency_rating.toFixed(1)}
            subtitle="Out of 5.0"
            icon="star"
            color="#f59e0b"
          />
          <MetricCard
            title="Pending Verification"
            value={metrics.pending_verifications}
            icon="clock-outline"
            color="#8b5cf6"
            trend={metrics.pending_verifications > 5 ? 10 : -5}
          />
        </View>
      </View>

      {/* Agency Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Agency Status</Text>

        <View style={styles.statusGrid}>
          <StatusIndicator status="verified" count={metrics.verified_agencies} />
          <StatusIndicator status="pending" count={metrics.pending_verifications} />
          <StatusIndicator status="active" count={metrics.active_agencies} />
        </View>
      </View>

      {/* Recent Alerts */}
      {alerts.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Alerts</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllLink}>View All</Text>
            </TouchableOpacity>
          </View>

          {alerts.slice(0, 5).map((alert) => (
            <AlertItem
              key={alert.id}
              title={alert.alert_type}
              message={alert.message}
              severity={alert.severity}
              timestamp={new Date(alert.created_at).toLocaleString()}
            />
          ))}
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <View style={styles.actionGrid}>
          <TouchableOpacity style={styles.actionButton}>
            <LinearGradient
              colors={["#667eea", "#764ba2"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.actionGradient}
            >
              <MaterialCommunityIcons name="plus" size={24} color="#fff" />
              <Text style={styles.actionText}>Verify Agencies</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <LinearGradient
              colors={["#f59e0b", "#f97316"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.actionGradient}
            >
              <MaterialCommunityIcons
                name="alert-circle"
                size={24}
                color="#fff"
              />
              <Text style={styles.actionText}>Manage Alerts</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <LinearGradient
              colors={["#10b981", "#34d399"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.actionGradient}
            >
              <MaterialCommunityIcons name="chart-line" size={24} color="#fff" />
              <Text style={styles.actionText}>View Reports</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <LinearGradient
              colors={["#3b82f6", "#60a5fa"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.actionGradient}
            >
              <MaterialCommunityIcons
                name="cog-outline"
                size={24}
                color="#fff"
              />
              <Text style={styles.actionText}>Settings</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Last updated: {new Date().toLocaleTimeString()}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  header: {
    padding: 20,
    paddingTop: 40,
  },
  headerContent: {
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
  },
  alertBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  alertBannerText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  viewAllLink: {
    color: "#667eea",
    fontWeight: "600",
    fontSize: 12,
  },
  metricsGrid: {
    gap: 12,
  },
  metricCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.05)",
  },
  metricHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  metricIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  trendBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  metricContent: {
    flex: 1,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 2,
  },
  metricTitle: {
    fontSize: 13,
    color: "#6b7280",
  },
  metricSubtitle: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 2,
  },
  statusGrid: {
    gap: 12,
  },
  statusIndicator: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusInfo: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 2,
  },
  statusCount: {
    fontSize: 16,
    fontWeight: "bold",
  },
  alertItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#ef4444",
  },
  alertIndicator: {
    width: 4,
    height: "100%",
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  alertMessage: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
    lineHeight: 16,
  },
  alertTime: {
    fontSize: 10,
    color: "#9ca3af",
  },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  actionButton: {
    width: (width - 52) / 2,
  },
  actionGradient: {
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  actionText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
    textAlign: "center",
  },
  footer: {
    alignItems: "center",
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  footerText: {
    fontSize: 12,
    color: "#9ca3af",
  },
});
