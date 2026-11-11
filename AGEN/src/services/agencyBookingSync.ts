/**
 * Agency Portal Realtime Booking Synchronizer
 * Subscribes to Supabase Realtime CDC events for the agency portal.
 * Real-time updates for BookingsScreen, Dashboard, and Operations.
 */

import { useEffect, useRef } from "react";
import { supabase } from "./supabaseClient";
import { eventBus, BookingPayload, BookingStatusChangedPayload } from "../../../src/services/events/eventBus";

export interface AgencyBookingSyncOptions {
  agencyId?: string;
  onBookingChange?: (booking: BookingPayload) => void;
  onStatusChange?: (payload: BookingStatusChangedPayload) => void;
}

export function useAgencyBookingRealtime(options: AgencyBookingSyncOptions = {}) {
  const onBookingChangeRef = useRef(options.onBookingChange);
  const onStatusChangeRef = useRef(options.onStatusChange);
  onBookingChangeRef.current = options.onBookingChange;
  onStatusChangeRef.current = options.onStatusChange;

  useEffect(() => {
    const channelName = options.agencyId
      ? `agency-bookings:${options.agencyId}`
      : "agency-bookings:global";

    const channel = supabase.channel(channelName);

    channel.on(
      "postgres_changes" as any,
      {
        event: "*",
        schema: "public",
        table: "bookings",
        filter: options.agencyId ? `agency_id=eq.${options.agencyId}` : undefined,
      },
      (payload: any) => {
        const { eventType, new: newRow, old: oldRow } = payload;

        if ((eventType === "INSERT" || eventType === "UPDATE") && newRow) {
          const booking = newRow as BookingPayload;
          onBookingChangeRef.current?.(booking);

          const oldStatus = oldRow?.status;
          const newStatus = booking.status;

          if (eventType === "UPDATE" && oldStatus !== newStatus) {
            const statusPayload: BookingStatusChangedPayload = {
              bookingId: booking.id,
              oldStatus,
              newStatus,
              bookingReference: booking.booking_reference,
              booking,
              timestamp: Date.now(),
              source: "supabase_realtime",
            };
            onStatusChangeRef.current?.(statusPayload);
            eventBus.emit("booking:status_changed", statusPayload);
          }
        }
      }
    );

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.log(`[AgencyRealtime] Subscribed to bookings channel: ${channelName}`);
      }
    });

    return () => {
      channel.unsubscribe().catch(() => {});
    };
  }, [options.agencyId]);
}
