import React from "react";
import { BookingSystemScreen } from "../../src/screens/BookingSystemScreen";
import { screens } from "../../src/data/screens";

export default function BookingSystemRoute() {
  const screen =
    screens.find((s) => s.slug === "booking-system") || screens[0];
  return <BookingSystemScreen screen={screen} />;
}
