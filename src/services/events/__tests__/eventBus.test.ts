import { EventBus, AppEventMap } from "../eventBus";

describe("EventBus Unit Tests", () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus();
  });

  afterEach(() => {
    bus.clear();
  });

  it("subscribes and receives emitted booking:status_changed events", () => {
    const mockListener = jest.fn();
    const unsubscribe = bus.on("booking:status_changed", mockListener);

    const testPayload = {
      bookingId: "bk-12345",
      oldStatus: "pending_payment",
      newStatus: "confirmed",
      bookingReference: "SJ-B12345",
      booking: {
        id: "bk-12345",
        status: "confirmed",
        destination_city: "Cox's Bazar",
        product_type: "flight",
      },
      timestamp: Date.now(),
      source: "supabase_realtime" as const,
    };

    bus.emit("booking:status_changed", testPayload);

    expect(mockListener).toHaveBeenCalledTimes(1);
    expect(mockListener).toHaveBeenCalledWith(testPayload);

    unsubscribe();
    bus.emit("booking:status_changed", testPayload);
    expect(mockListener).toHaveBeenCalledTimes(1); // Should not be called after unsubscribe
  });

  it("handles one-time subscriptions with once()", () => {
    const mockListener = jest.fn();
    bus.once("booking:cancelled", mockListener);

    bus.emit("booking:cancelled", { bookingId: "bk-999", reason: "Customer request" });
    bus.emit("booking:cancelled", { bookingId: "bk-999", reason: "Customer request duplicate" });

    expect(mockListener).toHaveBeenCalledTimes(1);
  });

  it("safely isolates errors in listener without crashing other listeners", () => {
    const faultyListener = jest.fn(() => {
      throw new Error("Simulated subscriber crash");
    });
    const goodListener = jest.fn();

    bus.on("booking:confirmed", faultyListener);
    bus.on("booking:confirmed", goodListener);

    expect(() => {
      bus.emit("booking:confirmed", { bookingId: "bk-555", reference: "SJ-555" });
    }).not.toThrow();

    expect(faultyListener).toHaveBeenCalled();
    expect(goodListener).toHaveBeenCalledTimes(1);
  });

  it("reports accurate listener count", () => {
    expect(bus.listenerCount("booking:created")).toBe(0);

    const unsub1 = bus.on("booking:created", () => {});
    const unsub2 = bus.on("booking:created", () => {});
    expect(bus.listenerCount("booking:created")).toBe(2);

    unsub1();
    expect(bus.listenerCount("booking:created")).toBe(1);

    unsub2();
    expect(bus.listenerCount("booking:created")).toBe(0);
  });
});
