/**
 * Supabase Realtime Booking Synchronizer
 * Listens to PostgreSQL CDC (Change Data Capture) events from Supabase Realtime
 * on the 'bookings' table and broadcasts updates to the cross-app EventBus.
 */

import { useEffect, useRef } from "react";
import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../utils/supabase";
import {
  eventBus,
  BookingPayload,
  BookingStatusChangedPayload,
  useEventBusListener,
} from "./events/eventBus";
import { appEventBus, APP_EVENTS } from "./events/appEventBus";

export interface BookingRealtimeSyncConfig {
  userId?: string;
  agencyId?: string;
  channelName?: string;
}

class BookingRealtimeService {
  private activeChannels: Map<string, RealtimeChannel> = new Map();
  private subscribersCount: Map<string, number> = new Map();

  /**
   * Start listening to Supabase Realtime events for bookings
   */
  public startSync(config: BookingRealtimeSyncConfig = {}): () => void {
    const channelKey = config.userId
      ? `bookings:user:${config.userId}`
      : config.agencyId
      ? `bookings:agency:${config.agencyId}`
      : "bookings:global";

    const currentCount = this.subscribersCount.get(channelKey) || 0;
    this.subscribersCount.set(channelKey, currentCount + 1);

    if (!this.activeChannels.has(channelKey)) {
      this.createChannel(channelKey, config);
    }

    return () => {
      const count = (this.subscribersCount.get(channelKey) || 1) - 1;
      if (count <= 0) {
        this.subscribersCount.delete(channelKey);
        const channel = this.activeChannels.get(channelKey);
        if (channel) {
          channel.unsubscribe().catch((err) => {
            console.warn(`[RealtimeSync] Unsubscribe error for ${channelKey}:`, err);
          });
          this.activeChannels.delete(channelKey);
        }
      } else {
        this.subscribersCount.set(channelKey, count);
      }
    };
  }

  private createChannel(channelKey: string, config: BookingRealtimeSyncConfig) {
    try {
      const filter = config.userId
        ? `user_id=eq.${config.userId}`
        : config.agencyId
        ? `agency_id=eq.${config.agencyId}`
        : undefined;

      const channel = supabase.channel(channelKey);

      channel.on(
        "postgres_changes" as any,
        {
          event: "*",
          schema: "public",
          table: "bookings",
          filter,
        },
        (payload: any) => {
          this.handleRealtimeEvent(payload);
        }
      );

      channel.subscribe((status, err) => {
        if (status === "SUBSCRIBED") {
          console.log(`[RealtimeSync] Successfully connected to channel: ${channelKey}`);
        } else if (status === "CHANNEL_ERROR") {
          console.warn(`[RealtimeSync] Channel error on ${channelKey}:`, err);
        }
      });

      this.activeChannels.set(channelKey, channel);
    } catch (err) {
      console.warn(`[RealtimeSync] Failed to initialize channel ${channelKey}:`, err);
    }
  }

  private handleRealtimeEvent(payload: {
    eventType: "INSERT" | "UPDATE" | "DELETE";
    new: any;
    old: any;
  }) {
    const { eventType, new: newRow, old: oldRow } = payload;

    if (eventType === "INSERT" && newRow) {
      const booking = newRow as BookingPayload;
      eventBus.emit("booking:created", { booking, source: "supabase_realtime" });
      eventBus.emit("booking:status_changed", {
        bookingId: booking.id,
        newStatus: booking.status,
        bookingReference: booking.booking_reference,
        booking,
        timestamp: Date.now(),
        source: "supabase_realtime",
      });
    } else if (eventType === "UPDATE" && newRow) {
      const booking = newRow as BookingPayload;
      const oldStatus = oldRow?.status;
      const newStatus = booking.status;

      eventBus.emit("booking:updated", {
        bookingId: booking.id,
        changes: booking,
        full: booking,
        source: "supabase_realtime",
      });

      if (oldStatus !== newStatus) {
        const statusPayload: BookingStatusChangedPayload = {
          bookingId: booking.id,
          oldStatus,
          newStatus,
          bookingReference: booking.booking_reference,
          booking,
          timestamp: Date.now(),
          source: "supabase_realtime",
        };

        eventBus.emit("booking:status_changed", statusPayload);

        // Also publish to enterprise AppEventBus for legacy screens
        appEventBus.publish(APP_EVENTS.BOOKING_STATUS_CHANGED, {
          bookingId: booking.id,
          currentStatus: newStatus,
          previousStatus: oldStatus,
          bookingReference: booking.booking_reference,
          userId: booking.user_id,
          productType: booking.product_type,
          destinationCity: booking.destination_city,
          totalPrice: booking.total_price || booking.final_price,
          timestamp: Date.now(),
          sourceScreen: "supabase_realtime",
          metadata: booking.metadata,
        });

        if (newStatus === "confirmed") {
          eventBus.emit("booking:confirmed", {
            bookingId: booking.id,
            reference: booking.booking_reference,
            booking,
          });
        } else if (newStatus === "cancelled" || newStatus === "refunded") {
          eventBus.emit("booking:cancelled", {
            bookingId: booking.id,
            reason: booking.cancellation_reason || "Status updated to cancelled",
            booking,
          });
        }
      }
    } else if (eventType === "DELETE" && oldRow) {
      eventBus.emit("booking:cancelled", {
        bookingId: oldRow.id,
        reason: "Booking record was deleted",
      });
    }
  }

  /**
   * Stop all active realtime sync channels
   */
  public stopAll() {
    this.activeChannels.forEach((channel) => {
      channel.unsubscribe().catch(() => {});
    });
    this.activeChannels.clear();
    this.subscribersCount.clear();
  }
}

export const bookingRealtimeService = new BookingRealtimeService();

/**
 * React Hook: Synchronize booking status across apps using Supabase Realtime
 * Subscribes to the live database changes and triggers `onStatusChange` when updated.
 */
export function useBookingRealtimeSync(options: {
  userId?: string;
  agencyId?: string;
  onStatusChange?: (payload: BookingStatusChangedPayload) => void;
  onBookingCreated?: (booking: BookingPayload) => void;
  onBookingUpdated?: (booking: BookingPayload) => void;
} = {}) {
  const onStatusChangeRef = useRef(options.onStatusChange);
  const onBookingCreatedRef = useRef(options.onBookingCreated);
  const onBookingUpdatedRef = useRef(options.onBookingUpdated);

  onStatusChangeRef.current = options.onStatusChange;
  onBookingCreatedRef.current = options.onBookingCreated;
  onBookingUpdatedRef.current = options.onBookingUpdated;

  // 1. Manage Realtime Supabase Channel
  useEffect(() => {
    const unsubscribeRealtime = bookingRealtimeService.startSync({
      userId: options.userId,
      agencyId: options.agencyId,
    });

    return () => {
      unsubscribeRealtime();
    };
  }, [options.userId, options.agencyId]);

  // 2. Attach EventBus listeners
  useEventBusListener(
    "booking:status_changed",
    (payload) => {
      if (options.userId && payload.booking.user_id && payload.booking.user_id !== options.userId) {
        return;
      }
      if (options.agencyId && payload.booking.agency_id && payload.booking.agency_id !== options.agencyId) {
        return;
      }
      onStatusChangeRef.current?.(payload);
    },
    [options.userId, options.agencyId]
  );

  useEventBusListener(
    "booking:created",
    (payload) => {
      if (options.userId && payload.booking.user_id && payload.booking.user_id !== options.userId) {
        return;
      }
      onBookingCreatedRef.current?.(payload.booking);
    },
    [options.userId, options.agencyId]
  );

  useEventBusListener(
    "booking:updated",
    (payload) => {
      if (options.userId && payload.full.user_id && payload.full.user_id !== options.userId) {
        return;
      }
      onBookingUpdatedRef.current?.(payload.full);
    },
    [options.userId, options.agencyId]
  );
}
