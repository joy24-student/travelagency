/**
 * Unit & Integration Tests: RealtimeBridge & appEventBus Mapping
 *
 * Verifies:
 * 1. Event mapping to appEventBus (BOOKING_STATUS_CHANGED & PAYMENT_COMPLETED)
 * 2. Bridge reconnect with exponential backoff (1s to 30s)
 * 3. Delta catch-up cursor fetching (created_at > lastSeenCreatedAt) on reconnect
 * 4. Auth lifecycle (subscribe after login, unsubscribe on logout)
 */

import {
  realtimeBridge,
  RealtimeBridge,
  mapBookingEventToAppEvents,
  BookingEventRow,
} from "../realtimeBridge";
import { appEventBus, APP_EVENTS } from "../../events/appEventBus";

describe("RealtimeBridge - appEventBus Mapping", () => {
  beforeEach(() => {
    appEventBus.clear();
    jest.clearAllMocks();
  });

  it("should map 'paid' event to both PAYMENT_COMPLETED and BOOKING_STATUS_CHANGED", () => {
    const rawEvent: BookingEventRow = {
      id: "evt-101",
      booking_id: "bk-777",
      type: "paid",
      actor_id: "usr-999",
      payload: {
        booking_reference: "SJ-20261108-XYZ1",
        status: "confirmed",
        final_price: 12500,
        currency: "BDT",
        provider: "bkash",
        transaction_id: "TRX-BKASH-888",
        destination_city: "Sylhet",
        product_type: "package",
      },
      created_at: "2026-11-08T10:00:00.000Z",
    };

    const { bookingStatusPayload, paymentCompletedPayload } =
      mapBookingEventToAppEvents(rawEvent);

    expect(bookingStatusPayload).toBeDefined();
    expect(bookingStatusPayload?.bookingId).toBe("bk-777");
    expect(bookingStatusPayload?.currentStatus).toBe("confirmed");
    expect(bookingStatusPayload?.bookingReference).toBe("SJ-20261108-XYZ1");
    expect(bookingStatusPayload?.userId).toBe("usr-999");
    expect(bookingStatusPayload?.totalPrice).toBe(12500);
    expect(bookingStatusPayload?.currency).toBe("BDT");

    expect(paymentCompletedPayload).toBeDefined();
    expect(paymentCompletedPayload?.transactionId).toBe("TRX-BKASH-888");
    expect(paymentCompletedPayload?.amount).toBe(12500);
    expect(paymentCompletedPayload?.currency).toBe("BDT");
    expect(paymentCompletedPayload?.paymentMethod).toBe("bkash");
    expect(paymentCompletedPayload?.status).toBe("completed");
    expect(paymentCompletedPayload?.bookingId).toBe("bk-777");
  });

  it("should map lifecycle status transitions ('confirmed', 'cancelled', 'checked_in')", () => {
    const events: Array<{ type: string; expectedStatus: string }> = [
      { type: "confirmed", expectedStatus: "confirmed" },
      { type: "rescheduled", expectedStatus: "confirmed" },
      { type: "cancelled", expectedStatus: "cancelled" },
      { type: "refunded", expectedStatus: "refunded" },
      { type: "checked_in", expectedStatus: "completed" },
      { type: "created", expectedStatus: "payment_pending" },
    ];

    for (const { type, expectedStatus } of events) {
      const raw: BookingEventRow = {
        id: `evt-${type}`,
        booking_id: "bk-abc",
        type,
        actor_id: "usr-1",
        payload: {
          destination_city: "Cox's Bazar",
        },
        created_at: "2026-11-08T11:00:00.000Z",
      };

      const { bookingStatusPayload, paymentCompletedPayload } =
        mapBookingEventToAppEvents(raw);

      expect(bookingStatusPayload?.currentStatus).toBe(expectedStatus);
      expect(paymentCompletedPayload).toBeUndefined();
    }
  });

  it("should publish events onto appEventBus and notify subscribers", () => {
    const statusListener = jest.fn();
    const paymentListener = jest.fn();

    appEventBus.subscribe(APP_EVENTS.BOOKING_STATUS_CHANGED, statusListener);
    appEventBus.subscribe(APP_EVENTS.PAYMENT_COMPLETED, paymentListener);

    const bridge = new RealtimeBridge({} as any);

    bridge.handleIncomingEvent({
      id: "evt-live-1",
      booking_id: "bk-live-1",
      type: "paid",
      actor_id: "usr-live",
      payload: {
        booking_reference: "SJ-LIVE-001",
        status: "confirmed",
        amount: 8500,
        currency: "BDT",
        transaction_id: "TX-LIVE-1",
        provider: "nagad",
      },
      created_at: "2026-11-08T12:00:00.000Z",
    });

    expect(statusListener).toHaveBeenCalledTimes(1);
    expect(statusListener).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingId: "bk-live-1",
        currentStatus: "confirmed",
        bookingReference: "SJ-LIVE-001",
      })
    );

    expect(paymentListener).toHaveBeenCalledTimes(1);
    expect(paymentListener).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionId: "TX-LIVE-1",
        amount: 8500,
        paymentMethod: "nagad",
      })
    );

    expect(bridge.getLastSeenCreatedAt()).toBe("2026-11-08T12:00:00.000Z");
  });
});

describe("RealtimeBridge - Exponential Backoff & Reconnect", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should exponentially grow backoff from 1s to 30s", () => {
    const mockChannel = {
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
    };
    const mockSupabase: any = {
      channel: jest.fn().mockReturnValue(mockChannel),
      removeChannel: jest.fn().mockResolvedValue({}),
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [] }),
    };

    const bridge = new RealtimeBridge(mockSupabase);
    bridge.subscribe("usr-test");

    expect(bridge.getCurrentBackoffMs()).toBe(1000);

    // 1st disconnect
    bridge.scheduleReconnect();
    expect(bridge.getCurrentBackoffMs()).toBe(2000);

    // 2nd disconnect
    bridge.scheduleReconnect();
    expect(bridge.getCurrentBackoffMs()).toBe(4000);

    // 3rd disconnect
    bridge.scheduleReconnect();
    expect(bridge.getCurrentBackoffMs()).toBe(8000);

    // 4th disconnect
    bridge.scheduleReconnect();
    expect(bridge.getCurrentBackoffMs()).toBe(16000);

    // 5th disconnect
    bridge.scheduleReconnect();
    expect(bridge.getCurrentBackoffMs()).toBe(30000);

    // 6th disconnect caps at 30s
    bridge.scheduleReconnect();
    expect(bridge.getCurrentBackoffMs()).toBe(30000);
  });

  it("should fetch events newer than last seen created_at on reconnect", async () => {
    const missedEvents: BookingEventRow[] = [
      {
        id: "evt-missed-1",
        booking_id: "bk-missed",
        type: "confirmed",
        actor_id: "usr-test",
        payload: { status: "confirmed", booking_reference: "SJ-MISSED" },
        created_at: "2026-11-08T12:05:00.000Z",
      },
    ];

    const orderMock = jest.fn().mockResolvedValue({ data: missedEvents });
    const gtMock = jest.fn().mockReturnValue({ order: orderMock });
    const selectMock = jest.fn().mockReturnValue({ gt: gtMock });
    const fromMock = jest.fn().mockReturnValue({ select: selectMock });

    const mockSupabase: any = {
      channel: jest.fn().mockReturnValue({
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn((cb) => {
          cb("SUBSCRIBED");
        }),
      }),
      removeChannel: jest.fn().mockResolvedValue({}),
      from: fromMock,
    };

    const statusListener = jest.fn();
    appEventBus.subscribe(APP_EVENTS.BOOKING_STATUS_CHANGED, statusListener);

    const bridge = new RealtimeBridge(mockSupabase);
    bridge.setLastSeenCreatedAt("2026-11-08T12:00:00.000Z");

    await bridge.fetchNewerEvents("2026-11-08T12:00:00.000Z");

    expect(fromMock).toHaveBeenCalledWith("booking_events");
    expect(selectMock).toHaveBeenCalledWith("*");
    expect(gtMock).toHaveBeenCalledWith(
      "created_at",
      "2026-11-08T12:00:00.000Z"
    );
    expect(orderMock).toHaveBeenCalledWith("created_at", { ascending: true });

    expect(statusListener).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingId: "bk-missed",
        currentStatus: "confirmed",
      })
    );
    expect(bridge.getLastSeenCreatedAt()).toBe("2026-11-08T12:05:00.000Z");
  });

  it("should subscribe after login and unsubscribe on logout", () => {
    let authCallback: (event: string, session: any) => void = () => {};
    const mockSupabase: any = {
      channel: jest.fn().mockReturnValue({
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(),
      }),
      removeChannel: jest.fn().mockResolvedValue({}),
      auth: {
        getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
        onAuthStateChange: jest.fn((cb) => {
          authCallback = cb;
          return { data: { subscription: { unsubscribe: jest.fn() } } };
        }),
      },
    };

    const bridge = new RealtimeBridge(mockSupabase);
    bridge.init();

    expect(bridge.getActiveUserId()).toBeNull();

    // Simulate login
    authCallback("SIGNED_IN", { user: { id: "user-loggedin-123" } });
    expect(bridge.getActiveUserId()).toBe("user-loggedin-123");
    expect(mockSupabase.channel).toHaveBeenCalled();

    // Simulate logout
    authCallback("SIGNED_OUT", null);
    expect(bridge.getActiveUserId()).toBeNull();
    expect(mockSupabase.removeChannel).toHaveBeenCalled();
  });
});
