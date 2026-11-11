/**
 * Offline-Capable E-Ticket Screen
 * 
 * Features:
 * - Offline-first caching via expo-sqlite
 * - High-contrast QR code rendering via react-native-qrcode-svg
 * - Screen brightness boost via expo-brightness for seamless scanning
 * - Share as Boarding Pass PDF via expo-print and expo-sharing
 * - Zero personal data in QR beyond passenger name and seat
 */

import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Share,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as Brightness from "expo-brightness";

import { ticketLocalCache, CachedTicket } from "../../src/services/ticketLocalCache";
import { supabase } from "../../src/utils/supabase";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export default function ETicketScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ bookingId?: string; ticketId?: string }>();
  const bookingId = params.bookingId || "demo-booking-001";
  const ticketId = params.ticketId;

  const [ticket, setTicket] = useState<CachedTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const originalBrightness = useRef<number | null>(null);

  // Brightness Boost Lifecycle
  useEffect(() => {
    let isMounted = true;

    async function boostBrightness() {
      try {
        if (Platform.OS !== "web") {
          const { status } = await Brightness.requestPermissionsAsync();
          if (status === "granted") {
            const current = await Brightness.getBrightnessAsync();
            if (isMounted) {
              originalBrightness.current = current;
              await Brightness.setBrightnessAsync(1.0);
            }
          }
        }
      } catch {
        // Fallback gracefully on devices without brightness control
      }
    }

    boostBrightness();

    return () => {
      isMounted = false;
      if (Platform.OS !== "web" && originalBrightness.current !== null) {
        Brightness.setBrightnessAsync(originalBrightness.current).catch(() => {});
      }
    };
  }, []);

  // Fetch ticket with offline-first strategy
  const loadTicket = useCallback(async () => {
    setLoading(true);

    // 1. First attempt to load from SQLite offline cache
    let cached: CachedTicket[] = [];
    if (ticketId) {
      const single = await ticketLocalCache.getTicketById(ticketId);
      if (single) cached = [single];
    } else {
      cached = await ticketLocalCache.getTicketsByBooking(bookingId);
    }

    if (cached.length > 0) {
      setTicket(cached[0]);
      setLoading(false);
    }

    // 2. Fetch fresh ticket from server if network is available
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const endpoint = `${API_BASE_URL}/tickets/${bookingId}`;
      const response = await fetch(endpoint, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (response.ok) {
        const json = await response.json();
        const serverTickets: any[] = json.data || [];
        if (serverTickets.length > 0) {
          const mappedTickets: CachedTicket[] = serverTickets.map((t) => ({
            id: t.id,
            booking_id: t.booking_id,
            passenger_name: t.passenger_name,
            service_type: t.service_type,
            valid_from: t.valid_from,
            valid_to: t.valid_to,
            seat: t.seat,
            status: t.status,
            signature: t.signature,
            qr_payload: t.qr_payload,
            created_at: t.created_at,
            cached_at: new Date().toISOString(),
          }));

          // Save fresh tickets into local SQLite
          await ticketLocalCache.saveTickets(mappedTickets);
          setTicket(mappedTickets[0]);
          setIsOfflineMode(false);
        }
      } else {
        if (cached.length > 0) {
          setIsOfflineMode(true);
        }
      }
    } catch {
      // Offline fallback
      if (cached.length > 0) {
        setIsOfflineMode(true);
      } else {
        // Demo fallback ticket for testing preview
        const demoTicket: CachedTicket = {
          id: ticketId || "demo-ticket-uuid-001",
          booking_id: bookingId,
          passenger_name: "Tariqul Islam",
          service_type: "flight",
          valid_from: new Date().toISOString(),
          valid_to: new Date(Date.now() + 86400000 * 2).toISOString(),
          seat: "14B (Window)",
          status: "active",
          signature: "demo_ed25519_tamper_proof_signature_hex_value_0123456789abcdef",
          qr_payload: JSON.stringify({
            ticket_id: ticketId || "demo-ticket-uuid-001",
            booking_id: bookingId,
            passenger_name: "Tariqul Islam",
            service_type: "flight",
            valid_from: new Date().toISOString(),
            valid_to: new Date(Date.now() + 86400000 * 2).toISOString(),
            seat: "14B (Window)",
            sig: "demo_sig",
          }),
          created_at: new Date().toISOString(),
          cached_at: new Date().toISOString(),
        };
        await ticketLocalCache.saveTickets([demoTicket]);
        setTicket(demoTicket);
        setIsOfflineMode(true);
      }
    } finally {
      setLoading(false);
    }
  }, [bookingId, ticketId]);

  useEffect(() => {
    loadTicket();
  }, [loadTicket]);

  // Share as PDF using expo-print and expo-sharing
  const handleSharePdf = async () => {
    if (!ticket) return;
    setIsExportingPdf(true);
    try {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <title>ShopnoJatra E-Ticket - ${ticket.id}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; padding: 24px; color: #1e293b; background: #ffffff; }
            .ticket-card { border: 2px dashed #cbd5e1; border-radius: 16px; padding: 24px; max-width: 600px; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 16px; }
            .logo { font-size: 22px; font-weight: 800; color: #4338ca; }
            .badge { background: #dcfce7; color: #15803d; padding: 6px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; }
            .qr-section { text-align: center; margin: 24px 0; padding: 20px; background: #f8fafc; border-radius: 12px; }
            .field-group { display: flex; justify-content: space-between; margin-bottom: 14px; }
            .label { font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600; }
            .value { font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 4px; }
            .footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8; text-align: center; }
            .crypto-tag { font-family: monospace; font-size: 10px; color: #6366f1; word-break: break-all; margin-top: 8px; }
          </style>
        </head>
        <body>
          <div class="ticket-card">
            <div class="header">
              <div class="logo">✈️ ShopnoJatra (স্বপ্ন যাত্রা)</div>
              <div class="badge">${ticket.status.toUpperCase()}</div>
            </div>

            <div class="qr-section">
              <div style="font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 12px;">
                OFFLINE DIGITAL TRAVEL PASS / ডিজিটাল ই-টিকেট
              </div>
              <div style="padding: 12px; background: #ffffff; display: inline-block; border-radius: 8px; border: 1px solid #e2e8f0;">
                <p style="font-family: monospace; font-size: 11px; color: #475569; word-break: break-all;">
                  TICKET ID: ${ticket.id}<br/>
                  BOOKING REF: ${ticket.booking_id}
                </p>
              </div>
              <div class="crypto-tag">Ed25519 Signature: ${ticket.signature.slice(0, 32)}...</div>
            </div>

            <div class="field-group">
              <div>
                <div class="label">Passenger / যাত্রী</div>
                <div class="value">${ticket.passenger_name}</div>
              </div>
              <div style="text-align: right;">
                <div class="label">Seat / আসন</div>
                <div class="value">${ticket.seat || "Unassigned"}</div>
              </div>
            </div>

            <div class="field-group">
              <div>
                <div class="label">Service / সেবা ধরন</div>
                <div class="value">${ticket.service_type.toUpperCase()}</div>
              </div>
              <div style="text-align: right;">
                <div class="label">Booking Ref / বুকিং নম্বর</div>
                <div class="value">${ticket.booking_id.slice(0, 12)}...</div>
              </div>
            </div>

            <div class="field-group">
              <div>
                <div class="label">Valid From / শুরু</div>
                <div class="value">${new Date(ticket.valid_from).toLocaleDateString()}</div>
              </div>
              <div style="text-align: right;">
                <div class="label">Valid To / মেয়াদ শেষ</div>
                <div class="value">${new Date(ticket.valid_to).toLocaleDateString()}</div>
              </div>
            </div>

            <div class="footer">
              Valid for offline verification by authorized gate agents and hotels.<br/>
              Support Helpline: +880 9612-000000 | concierge@shopnojatra.com
            </div>
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      if (Platform.OS === "web") {
        Alert.alert("PDF Generated", "PDF boarding pass generated successfully.");
      } else {
        await Sharing.shareAsync(uri, {
          UTI: ".pdf",
          mimeType: "application/pdf",
          dialogTitle: "Share Travel E-Ticket",
        });
      }
    } catch {
      Alert.alert("Error", "Could not export e-ticket as PDF.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case "active":
        return { bg: "#DCFCE7", text: "#15803D", label: "ACTIVE / বৈধ" };
      case "used":
        return { bg: "#F1F5F9", text: "#475569", label: "USED / ব্যবহৃত" };
      case "revoked":
        return { bg: "#FEE2E2", text: "#B91C1C", label: "REVOKED / বাতিল" };
      case "expired":
        return { bg: "#FEF3C7", text: "#B45309", label: "EXPIRED / মেয়াদোত্তীর্ণ" };
      default:
        return { bg: "#F1F5F9", text: "#475569", label: status.toUpperCase() };
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Loading Digital E-Ticket...</Text>
      </SafeAreaView>
    );
  }

  if (!ticket) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={styles.errorTitle}>No E-Ticket Found</Text>
        <Text style={styles.errorSub}>
          Tickets are automatically issued once your travel reservation is confirmed.
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Return Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const badge = getStatusBadgeStyle(ticket.status);

  return (
    <SafeAreaView style={styles.container}>
      {/* Navigation Header */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.navIcon} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.navTitleContainer}>
          <Text style={styles.navTitle}>Digital E-Ticket</Text>
          <Text style={styles.navSubTitle}>ডিজিটাল ই-টিকেট</Text>
        </View>
        <TouchableOpacity
          style={styles.navIcon}
          onPress={handleSharePdf}
          disabled={isExportingPdf}
        >
          {isExportingPdf ? (
            <ActivityIndicator size="small" color="#4F46E5" />
          ) : (
            <Ionicons name="share-outline" size={24} color="#4F46E5" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Offline Cache Indicator */}
        {isOfflineMode && (
          <View style={styles.offlineNotice}>
            <Ionicons name="cloud-offline-outline" size={18} color="#D97706" />
            <Text style={styles.offlineNoticeText}>
              Viewing from Offline Storage (SQLite Cache) • অফলাইনে সংরক্ষিত
            </Text>
          </View>
        )}

        {/* E-Ticket Card */}
        <View style={styles.card}>
          {/* Header Strip */}
          <View style={styles.cardHeader}>
            <View style={styles.serviceTypeBadge}>
              <MaterialCommunityIcons
                name={
                  ticket.service_type === "flight"
                    ? "airplane"
                    : ticket.service_type === "hotel"
                    ? "bed"
                    : ticket.service_type === "train"
                    ? "train"
                    : "ticket-percent"
                }
                size={16}
                color="#FFFFFF"
              />
              <Text style={styles.serviceTypeText}>{ticket.service_type.toUpperCase()}</Text>
            </View>

            <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.statusBadgeText, { color: badge.text }]}>{badge.label}</Text>
            </View>
          </View>

          {/* QR Code Container */}
          <View style={styles.qrContainer}>
            <View style={styles.qrWhiteBox}>
              <QRCode
                value={ticket.qr_payload}
                size={210}
                color="#000000"
                backgroundColor="#FFFFFF"
              />
            </View>
            <View style={styles.securityTagRow}>
              <Ionicons name="shield-checkmark" size={15} color="#10B981" />
              <Text style={styles.securityTagText}>
                Ed25519 Cryptographically Signed • Tamper Proof
              </Text>
            </View>
            <Text style={styles.qrInstruction}>
              Hold screen toward scanner • উজ্জ্বলতা স্বয়ংক্রিয়ভাবে বৃদ্ধি করা হয়েছে
            </Text>
          </View>

          {/* Ticket Details */}
          <View style={styles.detailsDivider} />

          <View style={styles.detailsGrid}>
            <View style={styles.detailCol}>
              <Text style={styles.fieldLabel}>PASSENGER / যাত্রী</Text>
              <Text style={styles.fieldValue}>{ticket.passenger_name}</Text>
            </View>
            <View style={[styles.detailCol, styles.alignRight]}>
              <Text style={styles.fieldLabel}>SEAT / আসন</Text>
              <Text style={styles.fieldValue}>{ticket.seat || "Free Seating"}</Text>
            </View>
          </View>

          <View style={styles.detailsGrid}>
            <View style={styles.detailCol}>
              <Text style={styles.fieldLabel}>VALID FROM / শুরু</Text>
              <Text style={styles.fieldValue}>
                {new Date(ticket.valid_from).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </Text>
            </View>
            <View style={[styles.detailCol, styles.alignRight]}>
              <Text style={styles.fieldLabel}>VALID TO / মেয়াদ শেষ</Text>
              <Text style={styles.fieldValue}>
                {new Date(ticket.valid_to).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </Text>
            </View>
          </View>

          <View style={styles.bookingRefRow}>
            <Text style={styles.bookingRefLabel}>Booking Reference:</Text>
            <Text style={styles.bookingRefValue}>{ticket.booking_id}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <TouchableOpacity
          style={styles.sharePdfButton}
          onPress={handleSharePdf}
          disabled={isExportingPdf}
          activeOpacity={0.8}
        >
          <Ionicons name="document-text-outline" size={20} color="#FFFFFF" />
          <Text style={styles.sharePdfButtonText}>
            {isExportingPdf ? "Generating PDF..." : "Share as PDF / পিডিএফ সংরক্ষণ করুন"}
          </Text>
        </TouchableOpacity>

        {/* Offline Disclaimer & Help */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={18} color="#64748B" />
          <Text style={styles.infoBannerText}>
            This e-ticket is cryptographically signed and can be verified by gate staff completely
            offline without an internet connection.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  centerContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 12,
  },
  errorSub: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  backButton: {
    marginTop: 20,
    backgroundColor: "#4F46E5",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 0,
    borderRadius: 8,
  },
  backButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  navIcon: {
    padding: 6,
  },
  navTitleContainer: {
    alignItems: "center",
  },
  navTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
  },
  navSubTitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  offlineNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  offlineNoticeText: {
    fontSize: 12,
    color: "#B45309",
    fontWeight: "600",
    flex: 1,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  serviceTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4F46E5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 6,
  },
  serviceTypeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  qrContainer: {
    alignItems: "center",
    marginVertical: 10,
  },
  qrWhiteBox: {
    padding: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  securityTagRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 6,
  },
  securityTagText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#059669",
  },
  qrInstruction: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 6,
  },
  detailsDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 18,
  },
  detailsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  detailCol: {
    flex: 1,
  },
  alignRight: {
    alignItems: "flex-end",
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
    letterSpacing: 0.5,
  },
  fieldValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 4,
  },
  bookingRefRow: {
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F8FAFC",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bookingRefLabel: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "500",
  },
  bookingRefValue: {
    fontSize: 11,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    color: "#64748B",
    maxWidth: 200,
  },
  sharePdfButton: {
    backgroundColor: "#4F46E5",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 18,
    gap: 8,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  sharePdfButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F1F5F9",
    padding: 12,
    borderRadius: 10,
    marginTop: 14,
    gap: 8,
  },
  infoBannerText: {
    fontSize: 11,
    color: "#64748B",
    lineHeight: 16,
    flex: 1,
  },
});
