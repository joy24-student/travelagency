import React, { useState } from "react";
import renderer, { act } from "react-test-renderer";
import { appEventBus, APP_EVENTS } from "../../services/events/appEventBus";
import { useScreenCollaboration } from "../useScreenCollaboration";

describe("useScreenCollaboration Hook", () => {
  beforeEach(() => {
    appEventBus.clear();
  });

  afterEach(() => {
    appEventBus.clear();
  });

  it("subscribes on mount and receives events emitted from other screens", () => {
    const received: any[] = [];

    function TestTripsScreen() {
      useScreenCollaboration(APP_EVENTS.BOOKING_STATUS_CHANGED, (payload) => {
        received.push(payload);
      });

      return null;
    }

    let root: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(<TestTripsScreen />);
    });

    expect(appEventBus.listenerCount(APP_EVENTS.BOOKING_STATUS_CHANGED)).toBe(1);

    // Screen A (BookingSystemScreen) finishes reservation
    act(() => {
      appEventBus.publish(APP_EVENTS.BOOKING_STATUS_CHANGED, {
        bookingId: "book-abc",
        currentStatus: "confirmed",
        timestamp: Date.now(),
      });
    });

    expect(received).toHaveLength(1);
    expect(received[0].bookingId).toBe("book-abc");
    expect(received[0].currentStatus).toBe("confirmed");

    // Clean up
    act(() => {
      root.unmount();
    });
  });

  it("automatically unsubscribes on unmount to prevent memory leaks", () => {
    function CollaboratingScreen() {
      useScreenCollaboration(APP_EVENTS.WEATHER_ALERT_TRIGGERED, () => {});
      return null;
    }

    let root: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(<CollaboratingScreen />);
    });

    expect(appEventBus.listenerCount(APP_EVENTS.WEATHER_ALERT_TRIGGERED)).toBe(1);

    // Screen unmounts (e.g. user navigates back)
    act(() => {
      root.unmount();
    });

    // Listener count must drop to 0, ensuring no memory leak
    expect(appEventBus.listenerCount(APP_EVENTS.WEATHER_ALERT_TRIGGERED)).toBe(0);
  });

  it("re-hydrates state immediately on mount when replayLast is true", () => {
    const received: any[] = [];

    // Screen A finished booking prior to TripsScreen mounting
    appEventBus.publish(APP_EVENTS.BOOKING_STATUS_CHANGED, {
      bookingId: "prior-booking",
      currentStatus: "confirmed",
      timestamp: Date.now(),
    });

    function LateMountingTripsScreen() {
      useScreenCollaboration(
        APP_EVENTS.BOOKING_STATUS_CHANGED,
        (payload) => {
          received.push(payload);
        },
        { replayLast: true }
      );
      return null;
    }

    let root: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(<LateMountingTripsScreen />);
    });

    // Listener receives the pre-existing event upon mounting
    expect(received).toHaveLength(1);
    expect(received[0].bookingId).toBe("prior-booking");

    act(() => {
      root.unmount();
    });
  });

  it("does not re-subscribe on screen re-renders when callback reference changes", () => {
    let capturedHandle: any;

    function DynamicScreen() {
      const [count, setCount] = useState(0);

      // Inline callback recreated every render
      const handle = useScreenCollaboration(APP_EVENTS.CURRENCY_CHANGED, (payload) => {
        // consumes latest count
      });

      capturedHandle = { ...handle, setCount };
      return null;
    }

    let root: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(<DynamicScreen />);
    });

    expect(appEventBus.listenerCount(APP_EVENTS.CURRENCY_CHANGED)).toBe(1);

    // Trigger state update / re-render
    act(() => {
      capturedHandle.setCount(1);
    });

    // Still exactly 1 listener, not duplicated
    expect(appEventBus.listenerCount(APP_EVENTS.CURRENCY_CHANGED)).toBe(1);

    act(() => {
      root.unmount();
    });

    expect(appEventBus.listenerCount(APP_EVENTS.CURRENCY_CHANGED)).toBe(0);
  });

  it("filters events when filter predicate is provided", () => {
    const received: any[] = [];

    function FilteredScreen() {
      useScreenCollaboration(
        APP_EVENTS.BOOKING_STATUS_CHANGED,
        (payload) => {
          received.push(payload);
        },
        {
          filter: (payload) => payload.bookingId === "target-123",
        }
      );
      return null;
    }

    let root: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(<FilteredScreen />);
    });

    // Publish non-matching event
    act(() => {
      appEventBus.publish(APP_EVENTS.BOOKING_STATUS_CHANGED, {
        bookingId: "other-456",
        currentStatus: "draft",
        timestamp: Date.now(),
      });
    });

    expect(received).toHaveLength(0);

    // Publish matching event
    act(() => {
      appEventBus.publish(APP_EVENTS.BOOKING_STATUS_CHANGED, {
        bookingId: "target-123",
        currentStatus: "confirmed",
        timestamp: Date.now(),
      });
    });

    expect(received).toHaveLength(1);
    expect(received[0].bookingId).toBe("target-123");

    act(() => {
      root.unmount();
    });
  });

  it("allows screen to emit events using the returned emit handle", () => {
    const listener = jest.fn();
    appEventBus.subscribe(APP_EVENTS.ITINERARY_UPDATED, listener);

    let emitterHandle: any;

    function SourceScreen() {
      emitterHandle = useScreenCollaboration(APP_EVENTS.ITINERARY_UPDATED, () => {});
      return null;
    }

    let root: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(<SourceScreen />);
    });

    act(() => {
      emitterHandle.emit({
        itineraryId: "itin-test",
        action: "created",
        destinationCity: "Sreemangal",
        timestamp: Date.now(),
      });
    });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        itineraryId: "itin-test",
        destinationCity: "Sreemangal",
      })
    );

    act(() => {
      root.unmount();
    });
  });
});
