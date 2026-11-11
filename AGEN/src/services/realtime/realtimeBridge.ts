/**
 * Realtime Booking Events Bridge - Shopno Jatra Agency Portal Architecture
 *
 * Subscribes to Supabase postgres_changes INSERT events on the booking_events table
 * for authenticated agency sessions, handles network reconnects with exponential backoff (1s-30s),
 * pulls delta updates on reconnect via cursor (created_at > lastSeenCreatedAt), and
 * maps events to local typed appEventBus events (BOOKING_STATUS_CHANGED & PAYMENT_COMPLETED).
 */

import { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { supabase as defaultSupabaseClient } from "../supabaseClient";
import {
  appEventBus,
  APP_EVENTS,
  BookingStatusChangedPayload,
  PaymentCompletedPayload,
} from "../events/appEventBus";

export interface BookingEventRow {
  id: string;
  booking_id: string;
  type:
    | "created"
    | "paid"
    | "confirmed"
    | "rescheduled"
    | "cancelled"
    | "refunded"
    | "checked_in"
    | string;
  actor_id?: string | null;
  payload: Record<string, any>;
  created_at: string;
}

export interface MappedAppEvents {
  bookingStatusPayload?: BookingStatusChangedPayload;
  paymentCompletedPayload?: PaymentCompletedPayload;
}

export function mapBookingEventToAppEvents(
  event: BookingEventRow
): MappedAppEvents {
  const p = event.payload || {};
  const timestamp = event.created_at
    ? new Date(event.created_at).getTime()
    : Date.now();
  const bookingId = event.booking_id;
  const bookingReference = p.booking_reference
    ? String(p.booking_reference)
    : undefined;
  const userId = event.actor_id
    ? String(event.actor_id)
    : p.user_id
    ? String(p.user_id)
    : undefined;
  const totalPrice = Number(p.final_price ?? p.total_price ?? p.amount ?? 0);
  const currency = p.currency ? String(p.currency) : "BDT";
  const destinationCity = p.destination_city
    ? String(p.destination_city)
    : undefined;
  const productType = p.product_type ? String(p.product_type) : undefined;

  let currentStatus = p.status ? String(p.status) : undefined;
  if (!currentStatus) {
    switch (event.type) {
      case "paid":
      case "confirmed":
      case "rescheduled":
        currentStatus = "confirmed";
        break;
      case "cancelled":
        currentStatus = "cancelled";
        break;
      case "refunded":
        currentStatus = "refunded";
        break;
      case "checked_in":
        currentStatus = "completed";
        break;
      case "created":
      default:
        currentStatus = "pending";
        break;
    }
  }

  const bookingStatusPayload: BookingStatusChangedPayload = {
    bookingId,
    currentStatus,
    previousStatus: p.previous_status ? String(p.previous_status) : undefined,
    bookingReference,
    userId,
    productType,
    destinationCity,
    totalPrice,
    currency,
    timestamp,
    sourceScreen: "AgencyRealtimeBridge",
    metadata: p,
  };

  let paymentCompletedPayload: PaymentCompletedPayload | undefined;
  if (
    event.type === "paid" ||
    p.payment_status === "completed" ||
    p.payment_status === "success"
  ) {
    paymentCompletedPayload = {
      transactionId: String(
        p.transaction_id || p.val_id || p.payment_id || event.id
      ),
      amount: Number(p.amount ?? p.final_price ?? totalPrice),
      currency,
      paymentMethod: String(p.provider || p.payment_method || "online"),
      status: "completed",
      bookingId,
      bookingReference,
      userId,
      timestamp,
      metadata: p,
    };
  }

  return { bookingStatusPayload, paymentCompletedPayload };
}

export class AgencyRealtimeBridge {
  private client: SupabaseClient;
  private channel: RealtimeChannel | null = null;
  private lastSeenCreatedAt: string | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private minBackoffMs = 1000;
  private maxBackoffMs = 30000;
  private currentBackoffMs = 1000;
  private isStarted = false;
  private isSubscribed = false;
  private activeUserId: string | null = null;
  private authUnsubscribe: (() => void) | null = null;

  constructor(supabaseClient: SupabaseClient = defaultSupabaseClient) {
    this.client = supabaseClient;
  }

  public setClient(supabaseClient: SupabaseClient): void {
    this.client = supabaseClient;
  }

  public getLastSeenCreatedAt(): string | null {
    return this.lastSeenCreatedAt;
  }

  public setLastSeenCreatedAt(timestampIso: string | null): void {
    this.lastSeenCreatedAt = timestampIso;
  }

  public getCurrentBackoffMs(): number {
    return this.currentBackoffMs;
  }

  public getIsSubscribed(): boolean {
    return this.isSubscribed;
  }

  public getActiveUserId(): string | null {
    return this.activeUserId;
  }

  public init(): () => void {
    if (this.authUnsubscribe) {
      this.authUnsubscribe();
      this.authUnsubscribe = null;
    }

    try {
      this.client.auth
        .getSession()
        .then(({ data }) => {
          if (data?.session?.user?.id) {
            this.subscribe(data.session.user.id);
          }
        })
        .catch(() => {});

      const { data: authListener } = this.client.auth.onAuthStateChange(
        (event, session) => {
          if (
            (event === "SIGNED_IN" || event === "INITIAL_SESSION") &&
            session?.user?.id
          ) {
            this.subscribe(session.user.id);
          } else if (event === "SIGNED_OUT") {
            this.unsubscribe();
          }
        }
      );

      this.authUnsubscribe = () => {
        authListener?.subscription?.unsubscribe();
      };
    } catch {
      // Handled safely
    }

    return () => this.destroy();
  }

  public subscribe(userId?: string): void {
    this.isStarted = true;
    if (userId) {
      this.activeUserId = userId;
    }

    this.clearReconnectTimer();
    this.setupChannel();
  }

  public unsubscribe(): void {
    this.isStarted = false;
    this.isSubscribed = false;
    this.activeUserId = null;
    this.clearReconnectTimer();

    if (this.channel) {
      try {
        this.client.removeChannel(this.channel).catch(() => {});
      } catch {
        // Handled
      }
      this.channel = null;
    }
  }

  public destroy(): void {
    this.unsubscribe();
    if (this.authUnsubscribe) {
      this.authUnsubscribe();
      this.authUnsubscribe = null;
    }
  }

  private setupChannel(): void {
    if (!this.isStarted) return;

    if (this.channel) {
      try {
        this.client.removeChannel(this.channel).catch(() => {});
      } catch {
        // Handled
      }
      this.channel = null;
    }

    const channelName = `agen-booking-events-${this.activeUserId || "anon"}-${Date.now()}`;

    try {
      const ch = this.client.channel(channelName);
      this.channel = ch;
      ch.on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "booking_events",
          },
          (payload) => {
            const row = payload.new as BookingEventRow | undefined;
            if (row) {
              this.handleIncomingEvent(row);
            }
          }
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            this.isSubscribed = true;
            this.currentBackoffMs = this.minBackoffMs;

            if (this.lastSeenCreatedAt) {
              this.fetchNewerEvents(this.lastSeenCreatedAt).catch(() => {});
            }
          } else if (
            status === "CLOSED" ||
            status === "CHANNEL_ERROR" ||
            status === "TIMED_OUT"
          ) {
            this.isSubscribed = false;
            if (this.isStarted) {
              this.scheduleReconnect();
            }
          }
        });
    } catch {
      this.scheduleReconnect();
    }
  }

  public scheduleReconnect(): void {
    if (!this.isStarted) return;
    this.clearReconnectTimer();

    const delay = this.currentBackoffMs;
    this.currentBackoffMs = Math.min(
      this.currentBackoffMs * 2,
      this.maxBackoffMs
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.isStarted) {
        this.setupChannel();
      }
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  public async fetchNewerEvents(sinceIso: string): Promise<void> {
    try {
      const { data, error } = await this.client
        .from("booking_events")
        .select("*")
        .gt("created_at", sinceIso)
        .order("created_at", { ascending: true });

      if (!error && Array.isArray(data)) {
        for (const item of data) {
          this.handleIncomingEvent(item as BookingEventRow);
        }
      }
    } catch {
      // Rejection handled safely
    }
  }

  public handleIncomingEvent(event: BookingEventRow): void {
    if (!event || !event.booking_id) return;

    if (event.created_at) {
      if (
        !this.lastSeenCreatedAt ||
        new Date(event.created_at).getTime() >
          new Date(this.lastSeenCreatedAt).getTime()
      ) {
        this.lastSeenCreatedAt = event.created_at;
      }
    }

    const { bookingStatusPayload, paymentCompletedPayload } =
      mapBookingEventToAppEvents(event);

    if (bookingStatusPayload) {
      appEventBus.publish(
        APP_EVENTS.BOOKING_STATUS_CHANGED,
        bookingStatusPayload
      );
    }

    if (paymentCompletedPayload) {
      appEventBus.publish(APP_EVENTS.PAYMENT_COMPLETED, paymentCompletedPayload);
    }
  }
}

export const realtimeBridge = new AgencyRealtimeBridge();
export const startRealtimeBridge = (userId?: string) =>
  realtimeBridge.subscribe(userId);
export const stopRealtimeBridge = () => realtimeBridge.unsubscribe();
export const initRealtimeBridge = () => realtimeBridge.init();
export default realtimeBridge;
