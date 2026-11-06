import {
  appEventBus,
  AppEventBus,
  APP_EVENTS,
  BOOKING_STATUS_CHANGED,
  ITINERARY_UPDATED,
  WEATHER_ALERT_TRIGGERED,
  PAYMENT_COMPLETED,
  CURRENCY_CHANGED,
  type BookingStatusChangedPayload,
  type ItineraryUpdatedPayload,
  type WeatherAlertTriggeredPayload,
  type PaymentCompletedPayload,
  type CurrencyChangedPayload,
} from "../appEventBus";

describe("AppEventBus Mobile Architecture", () => {
  let bus: AppEventBus;

  beforeEach(() => {
    bus = new AppEventBus();
    appEventBus.clear();
  });

  afterEach(() => {
    bus.clear();
  });

  describe("Requirement 1: Type-Safe Event Definitions", () => {
    it("should define all required event names with exact values", () => {
      expect(APP_EVENTS.BOOKING_STATUS_CHANGED).toBe("BOOKING_STATUS_CHANGED");
      expect(APP_EVENTS.ITINERARY_UPDATED).toBe("ITINERARY_UPDATED");
      expect(APP_EVENTS.WEATHER_ALERT_TRIGGERED).toBe("WEATHER_ALERT_TRIGGERED");
      expect(APP_EVENTS.PAYMENT_COMPLETED).toBe("PAYMENT_COMPLETED");
      expect(APP_EVENTS.CURRENCY_CHANGED).toBe("CURRENCY_CHANGED");

      expect(BOOKING_STATUS_CHANGED).toBe("BOOKING_STATUS_CHANGED");
      expect(ITINERARY_UPDATED).toBe("ITINERARY_UPDATED");
      expect(WEATHER_ALERT_TRIGGERED).toBe("WEATHER_ALERT_TRIGGERED");
      expect(PAYMENT_COMPLETED).toBe("PAYMENT_COMPLETED");
      expect(CURRENCY_CHANGED).toBe("CURRENCY_CHANGED");
    });

    it("should accept valid typed payload for BOOKING_STATUS_CHANGED", () => {
      const listener = jest.fn();
      bus.subscribe(APP_EVENTS.BOOKING_STATUS_CHANGED, listener);

      const payload: BookingStatusChangedPayload = {
        bookingId: "book-123",
        currentStatus: "confirmed",
        previousStatus: "draft",
        productType: "flight",
        userId: "user-456",
        bookingReference: "SJ-9988",
        totalPrice: 450,
        currency: "USD",
        timestamp: Date.now(),
        sourceScreen: "BookingSystemScreen",
      };

      bus.publish(APP_EVENTS.BOOKING_STATUS_CHANGED, payload);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(payload);
    });

    it("should accept valid typed payload for ITINERARY_UPDATED", () => {
      const listener = jest.fn();
      bus.subscribe(APP_EVENTS.ITINERARY_UPDATED, listener);

      const payload: ItineraryUpdatedPayload = {
        itineraryId: "itin-001",
        tripId: "trip-789",
        action: "item_added",
        destinationCity: "Cox's Bazar",
        itemCount: 4,
        timestamp: Date.now(),
        sourceScreen: "TripPlannerScreen",
      };

      bus.publish(APP_EVENTS.ITINERARY_UPDATED, payload);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(payload);
    });

    it("should accept valid typed payload for WEATHER_ALERT_TRIGGERED", () => {
      const listener = jest.fn();
      bus.subscribe(APP_EVENTS.WEATHER_ALERT_TRIGGERED, listener);

      const payload: WeatherAlertTriggeredPayload = {
        alertId: "alert-99",
        location: "Sylhet",
        severity: "warning",
        title: "Heavy Rainfall Warning",
        description: "Monsoon rains expected to delay departures.",
        effectiveUntil: Date.now() + 86400000,
        timestamp: Date.now(),
      };

      bus.publish(APP_EVENTS.WEATHER_ALERT_TRIGGERED, payload);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(payload);
    });

    it("should accept valid typed payload for PAYMENT_COMPLETED", () => {
      const listener = jest.fn();
      bus.subscribe(APP_EVENTS.PAYMENT_COMPLETED, listener);

      const payload: PaymentCompletedPayload = {
        transactionId: "txn-554433",
        bookingId: "book-123",
        amount: 54000,
        currency: "BDT",
        paymentMethod: "bkash",
        status: "completed",
        timestamp: Date.now(),
      };

      bus.publish(APP_EVENTS.PAYMENT_COMPLETED, payload);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(payload);
    });

    it("should accept valid typed payload for CURRENCY_CHANGED", () => {
      const listener = jest.fn();
      bus.subscribe(APP_EVENTS.CURRENCY_CHANGED, listener);

      const payload: CurrencyChangedPayload = {
        currentCurrency: "BDT",
        previousCurrency: "USD",
        exchangeRate: 121.5,
        timestamp: Date.now(),
      };

      bus.publish(APP_EVENTS.CURRENCY_CHANGED, payload);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(payload);
    });
  });

  describe("Requirement 2: Decoupled Pub-Sub & Isolation", () => {
    it("should deliver events to multiple decoupled subscribers", () => {
      const listenerA = jest.fn();
      const listenerB = jest.fn();
      const listenerC = jest.fn();

      bus.subscribe(APP_EVENTS.BOOKING_STATUS_CHANGED, listenerA);
      bus.subscribe(APP_EVENTS.BOOKING_STATUS_CHANGED, listenerB);
      bus.subscribe(APP_EVENTS.CURRENCY_CHANGED, listenerC);

      const payload: BookingStatusChangedPayload = {
        bookingId: "b-1",
        currentStatus: "completed",
        timestamp: Date.now(),
      };

      bus.publish(APP_EVENTS.BOOKING_STATUS_CHANGED, payload);

      expect(listenerA).toHaveBeenCalledWith(payload);
      expect(listenerB).toHaveBeenCalledWith(payload);
      expect(listenerC).not.toHaveBeenCalled();
    });

    it("should cleanly unsubscribe without impacting peer subscribers", () => {
      const listenerA = jest.fn();
      const listenerB = jest.fn();

      const unsubA = bus.subscribe(APP_EVENTS.BOOKING_STATUS_CHANGED, listenerA);
      bus.subscribe(APP_EVENTS.BOOKING_STATUS_CHANGED, listenerB);

      expect(bus.listenerCount(APP_EVENTS.BOOKING_STATUS_CHANGED)).toBe(2);

      unsubA();

      expect(bus.listenerCount(APP_EVENTS.BOOKING_STATUS_CHANGED)).toBe(1);

      bus.publish(APP_EVENTS.BOOKING_STATUS_CHANGED, {
        bookingId: "b-2",
        currentStatus: "cancelled",
        timestamp: Date.now(),
      });

      expect(listenerA).not.toHaveBeenCalled();
      expect(listenerB).toHaveBeenCalledTimes(1);
    });

    it("should isolate listener errors and prevent cascading failures", () => {
      const faultyListener = jest.fn().mockImplementation(() => {
        throw new Error("Screen rendering error during event handling");
      });
      const healthyListener = jest.fn();

      const errorHandler = jest.fn();
      bus.setErrorHandler(errorHandler);

      bus.subscribe(APP_EVENTS.PAYMENT_COMPLETED, faultyListener);
      bus.subscribe(APP_EVENTS.PAYMENT_COMPLETED, healthyListener);

      expect(() => {
        bus.publish(APP_EVENTS.PAYMENT_COMPLETED, {
          transactionId: "tx-err",
          amount: 100,
          currency: "USD",
          paymentMethod: "card",
          status: "completed",
          timestamp: Date.now(),
        });
      }).not.toThrow();

      expect(faultyListener).toHaveBeenCalled();
      expect(healthyListener).toHaveBeenCalled();
      expect(errorHandler).toHaveBeenCalled();
    });

    it("should support once() for one-time context notifications", () => {
      const oneTimeListener = jest.fn();
      bus.once(APP_EVENTS.CURRENCY_CHANGED, oneTimeListener);

      expect(bus.listenerCount(APP_EVENTS.CURRENCY_CHANGED)).toBe(1);

      bus.publish(APP_EVENTS.CURRENCY_CHANGED, {
        currentCurrency: "EUR",
        timestamp: Date.now(),
      });

      expect(oneTimeListener).toHaveBeenCalledTimes(1);
      expect(bus.listenerCount(APP_EVENTS.CURRENCY_CHANGED)).toBe(0);

      bus.publish(APP_EVENTS.CURRENCY_CHANGED, {
        currentCurrency: "GBP",
        timestamp: Date.now(),
      });

      expect(oneTimeListener).toHaveBeenCalledTimes(1);
    });

    it("should notify wildcard listeners across all application events", () => {
      const wildcard = jest.fn();
      const unsub = bus.subscribeAll(wildcard);

      bus.publish(APP_EVENTS.CURRENCY_CHANGED, {
        currentCurrency: "EUR",
        timestamp: Date.now(),
      });

      bus.publish(APP_EVENTS.WEATHER_ALERT_TRIGGERED, {
        location: "Dhaka",
        severity: "info",
        title: "Clear Skies",
        description: "Optimal travel conditions",
        timestamp: Date.now(),
      });

      expect(wildcard).toHaveBeenCalledTimes(2);
      unsub();
    });
  });

  describe("Requirement 3: State Re-Hydration", () => {
    it("should cache last event and provide it via getLastEvent()", () => {
      const payload: BookingStatusChangedPayload = {
        bookingId: "b-rehydrate-1",
        currentStatus: "confirmed",
        timestamp: Date.now(),
      };

      bus.publish(APP_EVENTS.BOOKING_STATUS_CHANGED, payload);

      const cached = bus.getLastEvent(APP_EVENTS.BOOKING_STATUS_CHANGED);
      expect(cached).toEqual(payload);
    });

    it("should immediately rehydrate late-mounting subscribers when replayLast is true", () => {
      const payload: BookingStatusChangedPayload = {
        bookingId: "b-late-mount",
        currentStatus: "confirmed",
        timestamp: Date.now(),
      };

      // Screen A (BookingSystemScreen) finishes reservation and emits event
      bus.publish(APP_EVENTS.BOOKING_STATUS_CHANGED, payload);

      // Later, Screen B (TripsScreen) mounts and subscribes with replayLast: true
      const tripsScreenListener = jest.fn();
      bus.subscribe(APP_EVENTS.BOOKING_STATUS_CHANGED, tripsScreenListener, {
        replayLast: true,
      });

      // Subscriber should immediately receive the cached state
      expect(tripsScreenListener).toHaveBeenCalledTimes(1);
      expect(tripsScreenListener).toHaveBeenCalledWith(payload);
    });

    it("should not replay if cached event exceeds replayMaxAgeMs", () => {
      const oldPayload: BookingStatusChangedPayload = {
        bookingId: "b-stale",
        currentStatus: "draft",
        timestamp: Date.now() - 5000,
      };

      bus.publish(APP_EVENTS.BOOKING_STATUS_CHANGED, oldPayload);

      const listener = jest.fn();
      bus.subscribe(APP_EVENTS.BOOKING_STATUS_CHANGED, listener, {
        replayLast: true,
        replayMaxAgeMs: 1000, // 1 second threshold
      });

      expect(listener).not.toHaveBeenCalled();
    });

    it("should re-hydrate open screens when rehydrate() is invoked", () => {
      const tripsScreenListener = jest.fn();
      bus.subscribe(APP_EVENTS.BOOKING_STATUS_CHANGED, tripsScreenListener);

      const payload: BookingStatusChangedPayload = {
        bookingId: "b-refresh",
        currentStatus: "confirmed",
        timestamp: Date.now(),
      };

      bus.publish(APP_EVENTS.BOOKING_STATUS_CHANGED, payload);
      expect(tripsScreenListener).toHaveBeenCalledTimes(1);

      // Trigger manual re-hydration
      const rehydrated = bus.rehydrate(APP_EVENTS.BOOKING_STATUS_CHANGED);
      expect(rehydrated).toBe(true);
      expect(tripsScreenListener).toHaveBeenCalledTimes(2);
    });

    it("should support cross-screen handoff context", () => {
      bus.setHandoffContext("activeDraftTrip", { destination: "Sajek Valley", nights: 3 });

      const retrieved = bus.getHandoffContext<{ destination: string; nights: number }>(
        "activeDraftTrip"
      );
      expect(retrieved).toEqual({ destination: "Sajek Valley", nights: 3 });

      bus.clearHandoffContext("activeDraftTrip");
      expect(bus.getHandoffContext("activeDraftTrip")).toBeUndefined();
    });
  });
});
