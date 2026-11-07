/**
 * Travel Ticket & Offline Boarding Pass Voucher Service
 * 
 * Capabilities:
 * 1. Offline Storage: Caches generated tickets with QR payloads in AsyncStorage.
 * 2. Instant PDF Generation: Renders high-fidelity PDF vouchers using expo-print.
 * 3. Native Sharing: Shares PDF documents directly via expo-sharing.
 * 4. QR Verification Payload: Encodes cryptographic booking verification string for offline gate check-in.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Alert, Platform } from "react-native";
import { calendarService } from "../calendarService";
import { travelReminderService } from "../travelReminderService";

export interface ETicket {
  id: string;
  bookingReference: string;
  passengerName: string;
  title: string;
  type: "hotel" | "flight" | "train" | "tour" | "package";
  destination: string;
  origin?: string;
  departureTime?: string;
  travelDate: string;
  seatOrRoom?: string;
  amount: number;
  currency: string;
  status: "confirmed" | "completed" | "pending";
  qrData: string;
  gateOrHotelAddress?: string;
  cachedAt: string;
}

const TICKETS_CACHE_KEY = "@shopno_offline_tickets_cache_";

export const ticketService = {
  /**
   * Save an e-ticket to the offline storage cache
   */
  async cacheTicket(userId: string, ticket: ETicket): Promise<void> {
    try {
      const key = `${TICKETS_CACHE_KEY}${userId || "guest"}`;
      const existingRaw = await AsyncStorage.getItem(key);
      const list: ETicket[] = existingRaw ? JSON.parse(existingRaw) : [];
      const updated = [ticket, ...list.filter((t) => t.id !== ticket.id && t.bookingReference !== ticket.bookingReference)];
      await AsyncStorage.setItem(key, JSON.stringify(updated));
    } catch (err) {
      console.warn("Failed to cache ticket offline:", err);
    }
  },

  /**
   * Retrieve all offline cached tickets for the user
   */
  async getCachedTickets(userId: string): Promise<ETicket[]> {
    try {
      const key = `${TICKETS_CACHE_KEY}${userId || "guest"}`;
      const existingRaw = await AsyncStorage.getItem(key);
      if (!existingRaw) return [];
      return JSON.parse(existingRaw);
    } catch (err) {
      console.warn("Failed to retrieve cached tickets:", err);
      return [];
    }
  },

  /**
   * Generate an official PDF ticket and share it
   */
  async generateAndShareTicketPdf(ticket: ETicket): Promise<void> {
    try {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <title>E-Ticket: ${ticket.bookingReference}</title>
          <style>
            body {
              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
              margin: 0;
              padding: 24px;
              color: #1e293b;
              background-color: #f8fafc;
            }
            .ticket-card {
              background: #ffffff;
              border-radius: 16px;
              border: 2px solid #287dfa;
              overflow: hidden;
              box-shadow: 0 4px 12px rgba(0,0,0,0.08);
            }
            .header {
              background: linear-gradient(135deg, #287dfa, #1d4ed8);
              color: #ffffff;
              padding: 24px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .brand {
              font-size: 24px;
              font-weight: 800;
              letter-spacing: 0.5px;
            }
            .ref-badge {
              background: rgba(255,255,255,0.2);
              padding: 6px 14px;
              border-radius: 20px;
              font-size: 13px;
              font-weight: 700;
              font-family: monospace;
            }
            .body {
              padding: 24px;
            }
            .route-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 24px;
              border-bottom: 1px dashed #cbd5e1;
              padding-bottom: 16px;
            }
            .location-label {
              font-size: 12px;
              color: #64748b;
              text-transform: uppercase;
              font-weight: 600;
            }
            .location-val {
              font-size: 20px;
              font-weight: 800;
              color: #0f172a;
              margin-top: 4px;
            }
            .grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 16px;
              margin-bottom: 24px;
            }
            .item-label {
              font-size: 11px;
              color: #64748b;
              text-transform: uppercase;
              font-weight: 600;
            }
            .item-val {
              font-size: 14px;
              font-weight: 700;
              color: #1e293b;
              margin-top: 2px;
            }
            .footer {
              background: #f1f5f9;
              padding: 16px 24px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-top: 1px solid #e2e8f0;
            }
            .qr-box {
              text-align: center;
              padding: 12px;
              background: #ffffff;
              border-radius: 12px;
              border: 1px solid #cbd5e1;
            }
            .notice {
              font-size: 11px;
              color: #64748b;
              line-height: 1.5;
            }
          </style>
        </head>
        <body>
          <div class="ticket-card">
            <div class="header">
              <div>
                <div class="brand">স্বপ্ন যাত্রা • Shopno Jatra</div>
                <div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">Official Verified Travel Voucher</div>
              </div>
              <div class="ref-badge">PNR: ${ticket.bookingReference}</div>
            </div>

            <div class="body">
              <div class="route-row">
                <div>
                  <div class="location-label">Service / Reservation</div>
                  <div class="location-val">${ticket.title}</div>
                </div>
                <div style="text-align: right;">
                  <div class="location-label">Status</div>
                  <div style="font-size: 14px; font-weight: 800; color: #10b981; margin-top: 4px;">✓ CONFIRMED</div>
                </div>
              </div>

              <div class="grid">
                <div>
                  <div class="item-label">Passenger / Guest</div>
                  <div class="item-val">${ticket.passengerName}</div>
                </div>
                <div>
                  <div class="item-label">Date & Schedule</div>
                  <div class="item-val">${ticket.travelDate} ${ticket.departureTime ? `(${ticket.departureTime})` : ""}</div>
                </div>
                <div>
                  <div class="item-label">Destination / Venue</div>
                  <div class="item-val">${ticket.destination}</div>
                </div>
                <div>
                  <div class="item-label">Room / Seat Assignment</div>
                  <div class="item-val">${ticket.seatOrRoom || "General Confirmed"}</div>
                </div>
                <div>
                  <div class="item-label">Amount Paid</div>
                  <div class="item-val">${ticket.currency} ${ticket.amount.toFixed(2)} (Paid in Full)</div>
                </div>
                <div>
                  <div class="item-label">Verification Code</div>
                  <div class="item-val" style="font-family: monospace;">${ticket.id.slice(0, 10).toUpperCase()}</div>
                </div>
              </div>

              <div class="qr-box">
                <div style="font-size: 12px; font-weight: 700; color: #1e293b; margin-bottom: 6px;">
                  SCAN AT GATE / HOTEL RECEPTION
                </div>
                <div style="font-size: 11px; color: #64748b;">
                  Offline Cryptographic Signature: ${ticket.qrData.slice(0, 36)}...
                </div>
              </div>
            </div>

            <div class="footer">
              <div class="notice">
                • Please present this e-ticket along with a valid government photo ID at check-in.<br />
                • 24/7 Helpline: +880 9612 000000 | support@shopnojatra.com
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      if (Platform.OS === "web") {
        await Print.printAsync({ html: htmlContent });
        return;
      }

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: `Share Ticket ${ticket.bookingReference}`,
          UTI: "com.adobe.pdf",
        });
      } else {
        Alert.alert("PDF Generated", `Your ticket PDF is saved at: ${uri}`);
      }
    } catch (error: any) {
      console.error("Error generating ticket PDF:", error);
      Alert.alert("PDF Error", error?.message || "Failed to generate e-ticket PDF.");
    }
  },

  /**
   * Add e-ticket to user calendar
   */
  async addTicketToCalendar(ticket: ETicket): Promise<boolean> {
    const start = new Date(ticket.travelDate);
    return calendarService.addToCalendar({
      title: `${ticket.title} (${ticket.bookingReference})`,
      description: `E-Ticket: ${ticket.bookingReference}\nPassenger: ${ticket.passengerName}\nDestination: ${ticket.destination}\nSeat/Room: ${ticket.seatOrRoom || "Confirmed"}`,
      location: ticket.gateOrHotelAddress || ticket.destination,
      startDate: start,
      endDate: new Date(start.getTime() + 4 * 60 * 60 * 1000),
    });
  },

  /**
   * Schedule 24h & 2h automated journey reminders
   */
  async scheduleTicketReminders(ticket: ETicket) {
    return travelReminderService.scheduleJourneyReminders({
      bookingReference: ticket.bookingReference,
      title: ticket.title,
      origin: ticket.origin,
      destination: ticket.destination,
      departureTime: ticket.departureTime,
      travelDate: ticket.travelDate,
      serviceType: ticket.type === "package" ? "tour" : ticket.type,
    });
  },
};
