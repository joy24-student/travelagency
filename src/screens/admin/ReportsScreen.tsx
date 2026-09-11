/**
 * Reports & Analytics Screen - Admin Panel
 * Generate and view financial reports, business metrics, and analytics
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
  ActivityIndicator,
  Alert,
  Dimensions,
  RefreshControl,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Svg, { Path, Circle } from "react-native-svg";
import { reportService, adminService } from "@/services/adminService";
import { FinancialReport, AdminUser } from "@/types/admin";

const { width, height } = Dimensions.get("window");

/**
 * Report Card Component
 */
const ReportCard: React.FC<{
  title: string;
  value: string | number;
  unit?: string;
  trend?: number;
  icon: string;
  gradient: [string, string];
  onPress?: () => void;
}> = ({ title, value, unit, trend, icon, gradient, onPress }) => {
  return (
    <TouchableOpacity onPress={onPress}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.reportCard}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardIcon}>
            <MaterialCommunityIcons name={icon as any} size={24} color="#fff" />
          </View>
          {trend !== undefined && (
            <View
              style={[
                styles.trendBadge,
                { backgroundColor: trend >= 0 ? "#d1fae5" : "#fee2e2" },
              ]}
            >
              <MaterialCommunityIcons
                name={trend >= 0 ? "trending-up" : "trending-down"}
                size={14}
                color={trend >= 0 ? "#059669" : "#dc2626"}
              />
              <Text style={{ color: trend >= 0 ? "#059669" : "#dc2626" }}>
                {Math.abs(trend)}%
              </Text>
            </View>
          )}
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>{title}</Text>
          <View style={styles.valueRow}>
            <Text style={styles.cardValue}>{value}</Text>
            {unit && <Text style={styles.unitText}>{unit}</Text>}
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

/**
 * Chart Component
 */
const SimpleChart: React.FC<{
  title: string;
  data: { label: string; value: number }[];
}> = ({ title, data }) => {
  const chartWidth = width - 40;
  const chartHeight = 200;
  const padding = 20;
  const graphWidth = chartWidth - 2 * padding;
  const graphHeight = chartHeight - 2 * padding;
  const maxValue = Math.max(...data.map((d) => d.value));

  const points = data.map((d, i) => ({
    x: padding + (i / (data.length - 1)) * graphWidth,
    y: chartHeight - padding - (d.value / maxValue) * graphHeight,
    label: d.label,
  }));

  const pathData = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  return (
    <LinearGradient
      colors={["#f5f7fa", "#ffffff"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.chartContainer}
    >
      <Text style={styles.chartTitle}>{title}</Text>
      <Svg width={chartWidth} height={chartHeight}>
        {/* Grid lines */}
        {[0, 1, 2, 3, 4].map((i) => (
          <React.Fragment key={`grid-${i}`}>
            <Path
              d={`M ${padding} ${padding + (i / 4) * graphHeight} L ${
                chartWidth - padding
              } ${padding + (i / 4) * graphHeight}`}
              stroke="#e5e7eb"
              strokeWidth="1"
              strokeDasharray="5,5"
            />
          </React.Fragment>
        ))}

        {/* Chart line */}
        <Path
          d={pathData}
          stroke="url(#chartGradient)"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {points.map((p, i) => (
          <Circle
            key={`point-${i}`}
            cx={p.x}
            cy={p.y}
            r="4"
            fill="#667eea"
            opacity="1"
          />
        ))}

        {/* Axes */}
        <Path
          d={`M ${padding} ${chartHeight - padding} L ${chartWidth - padding} ${
            chartHeight - padding
          }`}
          stroke="#d1d5db"
          strokeWidth="2"
        />
        <Path
          d={`M ${padding} ${padding} L ${padding} ${chartHeight - padding}`}
          stroke="#d1d5db"
          strokeWidth="2"
        />
      </Svg>
    </LinearGradient>
  );
};

/**
 * Financial Report Card
 */
const FinancialReportCard: React.FC<{
  report: FinancialReport;
  onPress: (report: FinancialReport) => void;
}> = ({ report, onPress }) => {
  return (
    <TouchableOpacity onPress={() => onPress(report)}>
      <LinearGradient
        colors={["#ffffff", "#f9fafb"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.financialReportCard}
      >
        <View style={styles.reportHeader}>
          <View>
            <Text style={styles.reportTitle}>
              {new Date(report.report_date || report.created_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
              })}
            </Text>
            <Text style={styles.reportSubtitle}>Financial Report</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: "#d1fae5" }]}>
            <Text style={[styles.statusText, { color: "#059669" }]}>
              {report.report_type.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.reportMetrics}>
          <View style={styles.metricRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Revenue</Text>
              <Text style={styles.metricValue}>
                ${report.total_revenue?.toFixed(2)}
              </Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Expenses</Text>
              <Text style={[styles.metricValue, { color: "#ef4444" }]}>
                ${report.total_expenses?.toFixed(2)}
              </Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Profit</Text>
              <Text style={[styles.metricValue, { color: "#10b981" }]}>
                $
                {(
                  (report.total_revenue || 0) - (report.total_expenses || 0)
                ).toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.reportFooter}>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="eye-outline" size={14} color="#667eea" />
            <Text style={styles.actionButtonText}>View</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <MaterialCommunityIcons name="download" size={14} color="#667eea" />
            <Text style={styles.actionButtonText}>Download</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <MaterialCommunityIcons
              name="share-variant"
              size={14}
              color="#667eea"
            />
            <Text style={styles.actionButtonText}>Share</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

/**
 * Reports & Analytics Screen
 */
export const ReportsScreen: React.FC<{ admin: AdminUser | null }> = ({
  admin,
}) => {
  const [reports, setReports] = useState<FinancialReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedReport, setSelectedReport] = useState<FinancialReport | null>(
    null,
  );

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const endDate = new Date().toISOString();
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days ago
      const allReports = await reportService.getFinancialReports("revenue", startDate, endDate);
      setReports(allReports);
    } catch (error) {
      console.error("Error loading reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReports();
    setRefreshing(false);
  };

  // Mock data for charts
  const revenueData = [
    { label: "Jan", value: 40 },
    { label: "Feb", value: 65 },
    { label: "Mar", value: 50 },
    { label: "Apr", value: 75 },
    { label: "May", value: 85 },
    { label: "Jun", value: 100 },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#3b82f6", "#2563eb"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Reports & Analytics</Text>
        <Text style={styles.headerSubtitle}>
          Financial metrics and business insights
        </Text>
      </LinearGradient>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.scrollContent}
        >
          {/* Key Metrics */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Key Metrics</Text>
            <View style={styles.metricsGrid}>
              <ReportCard
                title="Total Revenue"
                value="$125,450"
                unit="USD"
                trend={12.5}
                icon="cash"
                gradient={["#10b981", "#059669"]}
              />
              <ReportCard
                title="Total Bookings"
                value="1,245"
                trend={8.3}
                icon="calendar-check"
                gradient={["#06b6d4", "#0891b2"]}
              />
            </View>

            <View style={styles.metricsGrid}>
              <ReportCard
                title="Active Users"
                value="8,342"
                trend={-2.1}
                icon="users"
                gradient={["#667eea", "#764ba2"]}
              />
              <ReportCard
                title="Conversion Rate"
                value="3.2"
                unit="%"
                trend={5.7}
                icon="trending-up"
                gradient={["#f59e0b", "#f97316"]}
              />
            </View>
          </View>

          {/* Revenue Chart */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Revenue Trend</Text>
            <SimpleChart title="Monthly Revenue" data={revenueData} />
          </View>

          {/* Reports List */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Financial Reports</Text>
            {reports.length > 0 ? (
              <View>
                {reports.map((report) => (
                  <FinancialReportCard
                    key={report.id}
                    report={report}
                    onPress={(r) => setSelectedReport(r)}
                  />
                ))}
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons
                  name="file-document"
                  size={64}
                  color="#d1d5db"
                />
                <Text style={styles.emptyText}>
                  No financial reports available
                </Text>
              </View>
            )}
          </View>

          {/* Export Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Export Reports</Text>
            <View style={styles.exportGrid}>
              <TouchableOpacity style={styles.exportButton}>
                <LinearGradient
                  colors={["#667eea", "#764ba2"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.exportButtonGradient}
                >
                  <MaterialCommunityIcons
                    name="file-excel"
                    size={24}
                    color="#fff"
                  />
                  <Text style={styles.exportButtonText}>Export to Excel</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.exportButton}>
                <LinearGradient
                  colors={["#ef4444", "#dc2626"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.exportButtonGradient}
                >
                  <MaterialCommunityIcons
                    name="file-pdf-box"
                    size={24}
                    color="#fff"
                  />
                  <Text style={styles.exportButtonText}>Export to PDF</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ height: 30 }} />
        </ScrollView>
      )}
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
  scrollContent: {
    paddingHorizontal: 15,
    paddingTop: 20,
    paddingBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 12,
  },
  metricsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  reportCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  cardIcon: {
    justifyContent: "center",
    alignItems: "center",
  },
  trendBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  cardContent: {
    gap: 8,
  },
  cardTitle: {
    fontSize: 13,
    color: "#ffffff80",
    fontWeight: "500",
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#fff",
  },
  unitText: {
    fontSize: 12,
    color: "#ffffff80",
    fontWeight: "600",
  },
  chartContainer: {
    borderRadius: 12,
    padding: 16,
    overflow: "hidden",
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 12,
  },
  financialReportCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    overflow: "hidden",
  },
  reportHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 4,
  },
  reportSubtitle: {
    fontSize: 12,
    color: "#6b7280",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  reportMetrics: {
    marginBottom: 12,
  },
  metricRow: {
    flexDirection: "row",
    gap: 12,
  },
  metricItem: {
    flex: 1,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  metricLabel: {
    fontSize: 11,
    color: "#9ca3af",
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1f2937",
  },
  reportFooter: {
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
  exportGrid: {
    flexDirection: "row",
    gap: 12,
  },
  exportButton: {
    flex: 1,
  },
  exportButtonGradient: {
    paddingVertical: 16,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  exportButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  emptyContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: "#9ca3af",
    marginTop: 12,
  },
});

export default ReportsScreen;
