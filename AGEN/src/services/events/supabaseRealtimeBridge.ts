/**
 * Supabase Realtime Bridge for Agency Portal
 *
 * Bridges Supabase Postgres Realtime changes (bookings, payments, messages)
 * to Agency's appEventBus, enabling real-time cross-app synchronization.
 */

import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../supabaseClient";
import {
  appEventBus,
  APP_EVENTS,
  BookingStatusChangedPayload,
  PaymentCompletedPayload,
  NewMessageReceivedPayload,
} from "./appEventBus";

let bookingsChannel: RealtimeChannel | null = null;
let messagesChannel: RealtimeChannel | null = null;
let paymentsChannel: RealtimeChannel | null = null;

export function initAgencyRealtimeBridge(agencyId?: string): () => void {
  teardownAgencyRealtimeBridge();

  try {
    // 1. Listen for bookings mutations
    bookingsChannel = supabase
      .channel("agency-realtime-bookings")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
        },
        (payload) => {
          const record = (payload.new || payload.old) as Record<string, any> | undefined;
          if (!record) return;

          const eventPayload: BookingStatusChangedPayload = {
            bookingId: record.id,
            currentStatus: record.status || "pending",
            previousStatus: (payload.old as any)?.status,
            bookingReference: record.booking_reference,
            userId: record.user_id,
            productType: record.product_type,
            destinationCity: record.destination_city,
            totalPrice: Number(record.total_price || record.final_price || 0),
            currency: record.currency || "BDT",
            timestamp: Date.now(),
            sourceScreen: "AgencyRealtimeBridge",
          };

          appEventBus.publish(APP_EVENTS.BOOKING_STATUS_CHANGED, eventPayload);
        }
      )
      .subscribe();

    // 2. Listen for payments mutations
    paymentsChannel = supabase
      .channel("agency-realtime-payments")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "booking_payments",
        },
        (payload) => {
          const record = payload.new as Record<string, any> | undefined;
          if (!record) return;

          if (record.payment_status === "completed" || record.payment_status === "success") {
            const paymentPayload: PaymentCompletedPayload = {
              transactionId: record.transaction_id || record.id,
              amount: Number(record.amount || 0),
              currency: record.currency || "BDT",
              paymentMethod: record.payment_method || "card",
              status: "completed",
              bookingId: record.booking_id,
              userId: record.user_id,
              timestamp: Date.now(),
            };

            appEventBus.publish(APP_EVENTS.PAYMENT_COMPLETED, paymentPayload);

            if (record.booking_id) {
              appEventBus.publish(APP_EVENTS.BOOKING_STATUS_CHANGED, {
                bookingId: record.booking_id,
                currentStatus: "confirmed",
                timestamp: Date.now(),
                sourceScreen: "AgencyRealtimeBridge:Payment",
              });
            }
          }
        }
      )
      .subscribe();

    // 3. Listen for messages / customer inquiries
    messagesChannel = supabase
      .channel("agency-realtime-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const record = payload.new as Record<string, any> | undefined;
          if (!record) return;

          const msgPayload: NewMessageReceivedPayload = {
            messageId: record.id,
            senderId: record.sender_id || record.user_id,
            senderName: record.sender_name || record.name || "Customer",
            content: record.content || record.message || "",
            conversationId: record.conversation_id,
            unreadCount: 1,
            timestamp: Date.now(),
          };

          appEventBus.publish(APP_EVENTS.NEW_MESSAGE_RECEIVED, msgPayload);
        }
      )
      .subscribe();
  } catch (err) {
    console.warn("[AgencyRealtimeBridge] Init warning:", err);
  }

  return () => {
    teardownAgencyRealtimeBridge();
  };
}

export function teardownAgencyRealtimeBridge(): void {
  if (bookingsChannel) {
    supabase.removeChannel(bookingsChannel);
    bookingsChannel = null;
  }
  if (paymentsChannel) {
    supabase.removeChannel(paymentsChannel);
    paymentsChannel = null;
  }
  if (messagesChannel) {
    supabase.removeChannel(messagesChannel);
    messagesChannel = null;
  }
}
