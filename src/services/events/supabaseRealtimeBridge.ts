/**
 * Supabase Realtime Event Bus Bridge - Shopno Jatra Mobile Architecture
 *
 * Bridges Supabase Postgres Realtime table changes (bookings, payments) to the local
 * typed appEventBus so screens (Trips, Home, Checkout, etc.) automatically update
 * in real-time when records change across apps (Consumer, AGEN, Hotel).
 */

import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../../utils/supabase";
import {
  appEventBus,
  APP_EVENTS,
  BookingStatusChangedPayload,
  PaymentCompletedPayload,
} from "./appEventBus";

let bookingsChannel: RealtimeChannel | null = null;
let paymentsChannel: RealtimeChannel | null = null;
let groupTripsChannel: RealtimeChannel | null = null;

/**
 * Initializes Supabase Realtime listeners for bookings and payments,
 * translating remote mutations into typed AppEvents.
 */
export function initSupabaseRealtimeBridge(userId?: string): () => void {
  // Tear down any existing channels before creating new ones
  teardownSupabaseRealtimeBridge();

  try {
    // 1. Listen to Realtime changes on "bookings" table
    bookingsChannel = supabase
      .channel("realtime-app-bookings")
      .on(
        "postgres_changes",
        {
          event: "*", // INSERT, UPDATE, DELETE
          schema: "public",
          table: "bookings",
        },
        (payload) => {
          const newRecord = payload.new as Record<string, any> | undefined;
          const oldRecord = payload.old as Record<string, any> | undefined;

          if (!newRecord && !oldRecord) return;

          const record = newRecord || oldRecord || {};
          const status = record.status || "pending";
          const previousStatus = oldRecord?.status;

          const eventPayload: BookingStatusChangedPayload = {
            bookingId: record.id,
            currentStatus: status,
            previousStatus,
            bookingReference: record.booking_reference,
            userId: record.user_id,
            productType: record.product_type,
            destinationCity: record.destination_city,
            totalPrice: Number(record.total_price || record.final_price || 0),
            currency: record.currency || "BDT",
            timestamp: Date.now(),
            sourceScreen: "SupabaseRealtimeBridge",
            metadata: {
              changeType: payload.eventType,
            },
          };

          appEventBus.publish(APP_EVENTS.BOOKING_STATUS_CHANGED, eventPayload);
        }
      )
      .subscribe((status, err) => {
        if (err && typeof __DEV__ !== "undefined" && __DEV__) {
          console.warn("[RealtimeBridge] Bookings channel error:", err);
        }
      });

    // 2. Listen to Realtime changes on "booking_payments" table
    paymentsChannel = supabase
      .channel("realtime-app-payments")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "booking_payments",
        },
        (payload) => {
          const newRecord = payload.new as Record<string, any> | undefined;
          if (!newRecord) return;

          const paymentStatus = newRecord.payment_status;
          if (paymentStatus === "completed" || paymentStatus === "success") {
            const paymentPayload: PaymentCompletedPayload = {
              transactionId: newRecord.transaction_id || newRecord.id,
              amount: Number(newRecord.amount || 0),
              currency: newRecord.currency || "BDT",
              paymentMethod: newRecord.payment_method || "card",
              status: "completed",
              bookingId: newRecord.booking_id,
              userId: newRecord.user_id,
              timestamp: Date.now(),
              metadata: {
                gateway: newRecord.payment_gateway,
              },
            };

            appEventBus.publish(APP_EVENTS.PAYMENT_COMPLETED, paymentPayload);

            // Also emit booking status changed if attached to a booking
            if (newRecord.booking_id) {
              appEventBus.publish(APP_EVENTS.BOOKING_STATUS_CHANGED, {
                bookingId: newRecord.booking_id,
                currentStatus: "confirmed",
                timestamp: Date.now(),
                sourceScreen: "SupabaseRealtimeBridge:Payment",
              });
            }
          }
        }
      )
      .subscribe((status, err) => {
        if (err && typeof __DEV__ !== "undefined" && __DEV__) {
          console.warn("[RealtimeBridge] Payments channel error:", err);
        }
      });

    // 3. Listen to Realtime changes on Collaborative Group Trips
    groupTripsChannel = supabase
      .channel("realtime-app-group-trips")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "group_trips" },
        (payload) => {
          const rec = (payload.new || payload.old || {}) as Record<string, any>;
          appEventBus.publish(APP_EVENTS.GROUP_TRIP_UPDATED, {
            tripId: rec.id,
            action: payload.eventType === "INSERT" ? "created" : payload.eventType === "DELETE" ? "deleted" : "updated",
            title: rec.title,
            timestamp: Date.now(),
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trip_items" },
        (payload) => {
          const rec = (payload.new || payload.old || {}) as Record<string, any>;
          appEventBus.publish(APP_EVENTS.TRIP_ITEM_MUTATED, {
            itemId: rec.id,
            tripId: rec.trip_id,
            action: payload.eventType === "INSERT" ? "inserted" : payload.eventType === "DELETE" ? "deleted" : "updated",
            day: rec.day,
            version: rec.version,
            timestamp: Date.now(),
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trip_proposals" },
        (payload) => {
          const rec = (payload.new || payload.old || {}) as Record<string, any>;
          appEventBus.publish(APP_EVENTS.TRIP_PROPOSAL_MUTATED, {
            proposalId: rec.id,
            tripId: rec.trip_id,
            action: payload.eventType === "INSERT" ? "created" : rec.status === "accepted" ? "accepted" : "voted",
            status: rec.status,
            timestamp: Date.now(),
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trip_expenses" },
        (payload) => {
          const rec = (payload.new || payload.old || {}) as Record<string, any>;
          appEventBus.publish(APP_EVENTS.TRIP_EXPENSE_MUTATED, {
            expenseId: rec.id,
            tripId: rec.trip_id,
            action: payload.eventType === "INSERT" ? "created" : payload.eventType === "DELETE" ? "deleted" : "updated",
            amountPaisa: rec.amount_paisa ? BigInt(rec.amount_paisa) : undefined,
            paidBy: rec.paid_by,
            timestamp: Date.now(),
          });
        }
      )
      .subscribe();

  } catch (err) {
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      console.warn("[RealtimeBridge] Initialization failed:", err);
    }
  }

  return () => {
    teardownSupabaseRealtimeBridge();
  };
}

/**
 * Cleanly unbinds and removes all Supabase Realtime subscriptions.
 */
export function teardownSupabaseRealtimeBridge(): void {
  if (bookingsChannel) {
    supabase.removeChannel(bookingsChannel);
    bookingsChannel = null;
  }
  if (groupTripsChannel) {
    supabase.removeChannel(groupTripsChannel);
    groupTripsChannel = null;
  }
  if (paymentsChannel) {
    supabase.removeChannel(paymentsChannel);
    paymentsChannel = null;
  }
}
