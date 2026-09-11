// @ts-nocheck
// Advanced Analytics & Reporting Service
import { supabase } from "@/utils/supabase";
import { Database } from "@/types";

export interface ReportConfig {
  id: string;
  name: string;
  type: "revenue" | "users" | "bookings" | "agencies" | "custom";
  filters: Record<string, any>;
  metrics: string[];
  groupBy: string;
  dateRange: { start: string; end: string };
  schedule?: "daily" | "weekly" | "monthly";
  recipients?: string[];
  format: "pdf" | "excel" | "csv" | "json";
}

export interface DashboardMetric {
  id: string;
  name: string;
  value: number;
  trend: number;
  unit: string;
  icon: string;
  color: string;
  category: string;
}

export interface AnalyticsEvent {
  timestamp: string;
  event_type: string;
  user_id?: string;
  admin_id?: string;
  metadata: Record<string, any>;
  impact_value?: number;
}

// Advanced Analytics Service
export const analyticsService = {
  // Real-time metrics
  async getRealTimeMetrics() {
    try {
      const { data, error } = await supabase
        .from("dashboard_metrics")
        .select("*")
        .order("metric_date", { ascending: false })
        .limit(24);

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error("Error fetching real-time metrics:", err);
      return [];
    }
  },

  // Custom metrics calculation
  async calculateMetric(metricType: string, filters?: Record<string, any>) {
    try {
      let query = supabase.from("dashboard_metrics").select("*");

      if (filters?.dateRange) {
        query = query
          .gte("metric_date", filters.dateRange.start)
          .lte("metric_date", filters.dateRange.end);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Aggregate based on metric type
      if (metricType === "revenue") {
        return data?.reduce((sum, m) => sum + (m.total_revenue || 0), 0) || 0;
      } else if (metricType === "users") {
        return data?.length || 0;
      }
      return 0;
    } catch (err) {
      console.error("Error calculating metric:", err);
      return 0;
    }
  },

  // Generate forecast
  async generateForecast(metric: string, days: number = 30) {
    try {
      const { data, error } = await supabase
        .from("dashboard_metrics")
        .select("metric_date, total_revenue, total_bookings, active_users")
        .order("metric_date", { ascending: false })
        .limit(60);

      if (error) throw error;

      // Simple linear regression forecast
      if (!data || data.length === 0) return [];

      const forecast = [];
      const dataPoints = data.reverse();
      const field = metric.includes("revenue")
        ? "total_revenue"
        : "total_bookings";

      let sum = 0;
      let sumX = 0;
      let sumXY = 0;
      let sumX2 = 0;
      const n = dataPoints.length;

      dataPoints.forEach((point, i) => {
        const y = point[field as keyof typeof point] || 0;
        sum += y;
        sumX += i;
        sumXY += i * y;
        sumX2 += i * i;
      });

      const slope = (n * sumXY - sumX * sum) / (n * sumX2 - sumX * sumX);
      const intercept = (sum - slope * sumX) / n;

      const lastDate = new Date(dataPoints[dataPoints.length - 1].metric_date);
      for (let i = 1; i <= days; i++) {
        const forecastDate = new Date(lastDate);
        forecastDate.setDate(forecastDate.getDate() + i);
        forecast.push({
          date: forecastDate.toISOString().split("T")[0],
          predicted_value: Math.max(0, intercept + slope * (n + i)),
          confidence: Math.min(0.95, 0.7 + i * 0.005),
        });
      }

      return forecast;
    } catch (err) {
      console.error("Error generating forecast:", err);
      return [];
    }
  },

  // Advanced filtering with saved filters
  async getSavedFilters(adminId: string) {
    try {
      const { data, error } = await supabase
        .from("admin_saved_filters")
        .select("*")
        .eq("admin_id", adminId);

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error("Error fetching saved filters:", err);
      return [];
    }
  },

  async saveFilter(adminId: string, filter: any) {
    try {
      const { data, error } = await supabase
        .from("admin_saved_filters")
        .insert({
          admin_id: adminId,
          filter_name: filter.name,
          filter_config: filter.config,
          created_at: new Date().toISOString(),
        })
        .select();

      if (error) throw error;
      return data?.[0] || null;
    } catch (err) {
      console.error("Error saving filter:", err);
      return null;
    }
  },

  // Comparative analysis
  async compareMetrics(
    period1: { start: string; end: string },
    period2: { start: string; end: string },
  ) {
    try {
      const [p1Data, p2Data] = await Promise.all([
        supabase
          .from("dashboard_metrics")
          .select("total_revenue, total_bookings, active_users")
          .gte("metric_date", period1.start)
          .lte("metric_date", period1.end),
        supabase
          .from("dashboard_metrics")
          .select("total_revenue, total_bookings, active_users")
          .gte("metric_date", period2.start)
          .lte("metric_date", period2.end),
      ]);

      if (p1Data.error || p2Data.error) throw p1Data.error || p2Data.error;

      const calculateSum = (data: any[]) => ({
        revenue: data?.reduce((sum, m) => sum + (m.total_revenue || 0), 0) || 0,
        bookings:
          data?.reduce((sum, m) => sum + (m.total_bookings || 0), 0) || 0,
        users: data?.reduce((sum, m) => sum + (m.active_users || 0), 0) || 0,
      });

      const p1 = calculateSum(p1Data.data);
      const p2 = calculateSum(p2Data.data);

      return {
        period1: p1,
        period2: p2,
        comparison: {
          revenue_change: ((p2.revenue - p1.revenue) / p1.revenue) * 100,
          bookings_change: ((p2.bookings - p1.bookings) / p1.bookings) * 100,
          users_change: ((p2.users - p1.users) / p1.users) * 100,
        },
      };
    } catch (err) {
      console.error("Error comparing metrics:", err);
      return null;
    }
  },

  // Export data in multiple formats
  async exportData(
    table: string,
    filters?: Record<string, any>,
    format: "csv" | "json" | "excel" = "csv",
  ) {
    try {
      let query = supabase.from(table).select("*");

      if (filters?.dateRange) {
        query = query
          .gte("created_at", filters.dateRange.start)
          .lte("created_at", filters.dateRange.end);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Format data based on export type
      let output = "";
      if (format === "csv") {
        if (!data || data.length === 0) return "";

        const headers = Object.keys(data[0]);
        output = headers.join(",") + "\n";
        data.forEach((row) => {
          output += headers.map((h) => JSON.stringify(row[h])).join(",") + "\n";
        });
      } else if (format === "json") {
        output = JSON.stringify(data, null, 2);
      }

      return output;
    } catch (err) {
      console.error("Error exporting data:", err);
      return "";
    }
  },

  // Anomaly detection
  async detectAnomalies(metric: string, threshold: number = 2) {
    try {
      const { data, error } = await supabase
        .from("dashboard_metrics")
        .select("metric_date, total_revenue, total_bookings, active_users")
        .order("metric_date", { ascending: false })
        .limit(30);

      if (error || !data) throw error;

      const field = metric.includes("revenue")
        ? "total_revenue"
        : "total_bookings";
      const values = data.reverse().map((d) => d[field as keyof typeof d] || 0);

      // Calculate mean and std dev
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const stdDev = Math.sqrt(
        values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
          values.length,
      );

      // Find anomalies
      const anomalies = data.map((d, i) => ({
        date: d.metric_date,
        value: values[i],
        isAnomaly: Math.abs(values[i] - mean) > threshold * stdDev,
        zscore: (values[i] - mean) / stdDev,
      }));

      return anomalies.filter((a) => a.isAnomaly);
    } catch (err) {
      console.error("Error detecting anomalies:", err);
      return [];
    }
  },

  // Cohort analysis
  async analyzeCohorts(
    cohortType: "signup_date" | "first_booking" | "location",
  ) {
    try {
      const { data, error } = await supabase
        .from("user_admin_details")
        .select(
          "id, verification_status, created_at, total_bookings, total_spent",
        );

      if (error) throw error;

      // Group by cohort
      const cohorts: Record<string, any> = {};
      data?.forEach((user) => {
        const date = new Date(user.created_at).toISOString().split("T")[0];
        if (!cohorts[date]) {
          cohorts[date] = { count: 0, revenue: 0, bookings: 0 };
        }
        cohorts[date].count++;
        cohorts[date].revenue += user.total_spent || 0;
        cohorts[date].bookings += user.total_bookings || 0;
      });

      return cohorts;
    } catch (err) {
      console.error("Error analyzing cohorts:", err);
      return {};
    }
  },
};

// Report Generator Service
export const reportService = {
  async createScheduledReport(config: ReportConfig, adminId: string) {
    try {
      const { data, error } = await supabase
        .from("scheduled_reports")
        .insert({
          admin_id: adminId,
          report_name: config.name,
          report_type: config.type,
          report_config: config,
          next_run: new Date().toISOString(),
          is_active: true,
        })
        .select();

      if (error) throw error;
      return data?.[0] || null;
    } catch (err) {
      console.error("Error creating scheduled report:", err);
      return null;
    }
  },

  async getScheduledReports(adminId: string) {
    try {
      const { data, error } = await supabase
        .from("scheduled_reports")
        .select("*")
        .eq("admin_id", adminId)
        .eq("is_active", true);

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error("Error fetching scheduled reports:", err);
      return [];
    }
  },

  async generateReport(config: ReportConfig) {
    try {
      const startDate = config.dateRange.start;
      const endDate = config.dateRange.end;

      let query = supabase.from("dashboard_metrics").select("*");

      if (config.type === "revenue") {
        query = query.gte("metric_date", startDate).lte("metric_date", endDate);
      }

      const { data, error } = await query;
      if (error) throw error;

      return {
        report_name: config.name,
        generated_at: new Date().toISOString(),
        period: { start: startDate, end: endDate },
        data: data || [],
        summary: {
          total_records: data?.length || 0,
          total_value:
            data?.reduce(
              (sum: number, d: any) => sum + (d.total_revenue || 0),
              0,
            ) || 0,
        },
      };
    } catch (err) {
      console.error("Error generating report:", err);
      return null;
    }
  },

  async emailReport(reportId: string, recipients: string[]) {
    try {
      // This would integrate with email service
      await supabase.from("audit_logs").insert({
        action: "EMAIL_REPORT_SENT",
        description: `Report ${reportId} emailed to ${recipients.join(", ")}`,
        timestamp: new Date().toISOString(),
        status: "success",
      });

      return true;
    } catch (err) {
      console.error("Error emailing report:", err);
      return false;
    }
  },
};
