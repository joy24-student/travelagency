/**
 * Active Trip Dynamic Island / Dock Store (Zustand)
 * Manages contextual state morphing, trip data models, and micro-widget UI state.
 */

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import * as Haptics from "expo-haptics";
import { cachedStateStorage } from "./storage";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type DockMode = "pre_departure" | "in_trip" | "check_in_day" | "hidden";
export type TransportType = "flight" | "bus" | "train";
export type BoardingStatus =
  | "scheduled"
  | "on_time"
  | "delayed"
  | "boarding"
  | "gate_closing"
  | "departed";
export type HotelRoomStatus = "preparing" | "cleaning" | "ready" | "checked_in";
export type KeylessEntryState = "idle" | "transmitting" | "unlocked" | "error";
export type WeatherCondition =
  | "sunny"
  | "partly_cloudy"
  | "cloudy"
  | "rain"
  | "thunderstorm"
  | "clear";

export interface FlightBusTripData {
  transportType: TransportType;
  tripReference: string; // e.g. "BG-084" or "GL-501"
  carrier: string; // e.g. "Biman Bangladesh Airlines"
  carrierCode: string; // e.g. "BG"
  origin: {
    code: string; // "DAC"
    name: string; // "Hazrat Shahjalal Intl"
    city: string; // "Dhaka"
    terminal?: string; // "T2"
  };
  destination: {
    code: string; // "CXB"
    name: string; // "Cox's Bazar Domestic Airport"
    city: string; // "Cox's Bazar"
    terminal?: string; // "Domestic"
  };
  departureTime: string; // ISO format string
  estimatedArrivalTime: string; // ISO format string
  gate: string; // "Gate 04B"
  seat: string; // "14A"
  boardingGroup: string; // "Group 2"
  boardingStatus: BoardingStatus;
  pnr: string; // "SJ-7798X"
  baggageBelt?: string; // "Belt 03"
  qrCodeData: string;
}

export interface InTripActivityData {
  tripName: string;
  currentDay: number;
  totalDays: number;
  nextActivity: {
    id: string;
    title: string;
    category: "marine" | "adventure" | "dining" | "culture" | "sightseeing";
    scheduledTime: string; // e.g. "16:30"
    startTimeIso: string;
    locationName: string;
    address?: string;
    duration: string;
    leadGuide?: {
      name: string;
      phone: string;
      rating: number;
    };
    bookingReference?: string;
    specialNotes?: string;
  };
  upcomingMilestones: Array<{
    time: string;
    title: string;
    location: string;
  }>;
  localWeather: {
    temperatureC: number;
    condition: WeatherCondition;
    description: string;
    highC: number;
    lowC: number;
    humidityPercent: number;
    uvIndex: number;
    windKmh: number;
    cityName: string;
  };
}

export interface HotelCheckInData {
  hotelName: string;
  hotelAddress: string;
  confirmationCode: string;
  roomType: string;
  roomNumber: string;
  floor: string;
  checkInDate: string;
  checkInTimeWindow: string; // "14:00 - 23:00"
  checkOutDate: string;
  roomStatus: HotelRoomStatus;
  keylessEntry: {
    isEligible: boolean;
    state: KeylessEntryState;
    passcode: string;
    lastUnlockedAt?: string;
    batteryLevel?: number;
  };
  hotelServices: {
    wifiNetwork: string;
    wifiPassword: string;
    breakfastInfo: string;
    conciergePhone: string;
  };
}

// ============================================================================
// DEFAULT MOCK TRIP DATA
// ============================================================================

// Simulated departure: 3 hours and 25 minutes from now
const now = new Date();
const mockDepartureTime = new Date(now.getTime() + 3 * 3600 * 1000 + 25 * 60 * 1000).toISOString();
const mockArrivalTime = new Date(now.getTime() + 4 * 3600 * 1000 + 35 * 60 * 1000).toISOString();
const mockActivityTime = new Date(now.getTime() + 1 * 3600 * 1000 + 15 * 60 * 1000).toISOString();

export const DEFAULT_PRE_DEPARTURE_DATA: FlightBusTripData = {
  transportType: "flight",
  tripReference: "BG-084",
  carrier: "Biman Bangladesh Airlines",
  carrierCode: "BG",
  origin: {
    code: "DAC",
    name: "Hazrat Shahjalal Intl",
    city: "Dhaka",
    terminal: "T2",
  },
  destination: {
    code: "CXB",
    name: "Cox's Bazar Airport",
    city: "Cox's Bazar",
    terminal: "Domestic",
  },
  departureTime: mockDepartureTime,
  estimatedArrivalTime: mockArrivalTime,
  gate: "Gate 04B",
  seat: "14A",
  boardingGroup: "Group 2",
  boardingStatus: "boarding",
  pnr: "SJ-8824CX",
  baggageBelt: "Carousel 02",
  qrCodeData: "SHOPNO-TRIP:BG-084:DAC-CXB:14A:SJ-8824CX",
};

export const DEFAULT_IN_TRIP_DATA: InTripActivityData = {
  tripName: "Cox's Bazar & Saint Martin's Escapade",
  currentDay: 2,
  totalDays: 4,
  nextActivity: {
    id: "act_sun_01",
    title: "Sunset Catamaran & Dolphin Watching",
    category: "marine",
    scheduledTime: "16:45",
    startTimeIso: mockActivityTime,
    locationName: "Inani Beach Marine Pier",
    address: "Marine Drive Road, Cox's Bazar",
    duration: "2h 30m",
    leadGuide: {
      name: "Captain Farhan",
      phone: "+880 1711-889900",
      rating: 4.9,
    },
    bookingReference: "SJ-ACT-9902",
    specialNotes: "Bring sunglasses, camera & waterproof phone pouch.",
  },
  upcomingMilestones: [
    { time: "16:45", title: "Sunset Catamaran Cruise", location: "Inani Pier" },
    { time: "19:30", title: "Seafood BBQ Dinner by the Shore", location: "Mermaid Beach Cafe" },
    { time: "21:30", title: "Stargazing & Beach Campfire", location: "South Inani Bay" },
  ],
  localWeather: {
    temperatureC: 28,
    condition: "partly_cloudy",
    description: "Partly Cloudy • Sea Breeze",
    highC: 31,
    lowC: 24,
    humidityPercent: 68,
    uvIndex: 6,
    windKmh: 14,
    cityName: "Cox's Bazar",
  },
};

export const DEFAULT_CHECK_IN_DATA: HotelCheckInData = {
  hotelName: "Sea Pearl Beach Resort & Spa",
  hotelAddress: "Jaliapalong, Inani, Cox's Bazar 4750",
  confirmationCode: "HTL-940281",
  roomType: "Executive Ocean View King Suite",
  roomNumber: "Suite 504",
  floor: "5th Floor • North Wing",
  checkInDate: "Today",
  checkInTimeWindow: "14:00 - 23:00",
  checkOutDate: "Nov 09, 12:00 PM",
  roomStatus: "ready",
  keylessEntry: {
    isEligible: true,
    state: "idle",
    passcode: "5042",
    batteryLevel: 94,
  },
  hotelServices: {
    wifiNetwork: "SeaPearl_Guest_VIP",
    wifiPassword: "jatra-luxe-2026",
    breakfastInfo: "07:00 - 10:30 AM (Coral Reef Hall)",
    conciergePhone: "+880 1844-016001",
  },
};

// ============================================================================
// DOCK STORE STATE & ACTIONS
// ============================================================================

export interface DockState {
  // Mode & Context
  mode: DockMode;
  autoMorph: boolean;

  // Widget UI State
  isExpanded: boolean;
  isMinimized: boolean;
  isDismissed: boolean;
  dismissedAt: number | null;

  // Floating Position (offsets from default top-center anchor)
  dockPosition: { x: number; y: number };

  // Context Data Models
  preDeparture: FlightBusTripData;
  inTrip: InTripActivityData;
  checkInDay: HotelCheckInData;

  // Actions
  setMode: (mode: DockMode) => void;
  cycleMode: () => void;
  setAutoMorph: (enabled: boolean) => void;
  evaluateContext: () => void;

  // Micro-widget interaction
  expand: () => void;
  collapse: () => void;
  toggleExpand: () => void;
  minimize: () => void;
  restore: () => void;
  dismiss: (snoozeMinutes?: number) => void;
  undismiss: () => void;

  // Dragging & Springs
  setDockPosition: (pos: { x: number; y: number }) => void;
  resetDockPosition: () => void;

  // Domain Actions
  triggerKeylessEntry: () => Promise<boolean>;
  updateGate: (gate: string) => void;
  updateBoardingStatus: (status: BoardingStatus) => void;
  updateWeather: (weather: Partial<InTripActivityData["localWeather"]>) => void;
  updateRoomStatus: (status: HotelRoomStatus) => void;
  setPreDepartureData: (data: Partial<FlightBusTripData>) => void;
  setInTripData: (data: Partial<InTripActivityData>) => void;
  setCheckInData: (data: Partial<HotelCheckInData>) => void;
  resetToMockData: () => void;
}

export const useDockStore = create<DockState>()(
  persist(
    (set, get) => ({
      mode: "pre_departure",
      autoMorph: true,

      isExpanded: false,
      isMinimized: false,
      isDismissed: false,
      dismissedAt: null,

      dockPosition: { x: 0, y: 0 },

      preDeparture: DEFAULT_PRE_DEPARTURE_DATA,
      inTrip: DEFAULT_IN_TRIP_DATA,
      checkInDay: DEFAULT_CHECK_IN_DATA,

      setMode: (mode: DockMode) => {
        set({ mode });
      },

      cycleMode: () => {
        const current = get().mode;
        const modes: DockMode[] = ["pre_departure", "in_trip", "check_in_day"];
        const nextIdx = (modes.indexOf(current) + 1) % modes.length;
        set({ mode: modes[nextIdx] });
      },

      setAutoMorph: (enabled: boolean) => {
        set({ autoMorph: enabled });
        if (enabled) {
          get().evaluateContext();
        }
      },

      evaluateContext: () => {
        const state = get();
        if (!state.autoMorph) return;

        const currentTimestamp = Date.now();
        const departureTimestamp = new Date(state.preDeparture.departureTime).getTime();
        const diffMs = departureTimestamp - currentTimestamp;
        const hoursUntilDeparture = diffMs / (1000 * 60 * 60);

        // 1. Within 4 hours before departure (and up to 30 mins after departure)
        if (hoursUntilDeparture > -0.5 && hoursUntilDeparture <= 4.0) {
          if (state.mode !== "pre_departure") {
            set({ mode: "pre_departure" });
          }
          return;
        }

        // 2. Check-in day: If room status is ready or hotel check-in window is open today
        if (
          state.checkInDay.roomStatus === "ready" ||
          state.checkInDay.roomStatus === "preparing" ||
          state.checkInDay.roomStatus === "cleaning"
        ) {
          if (state.mode !== "check_in_day") {
            set({ mode: "check_in_day" });
          }
          return;
        }

        // 3. Otherwise during trip
        if (state.mode !== "in_trip") {
          set({ mode: "in_trip" });
        }
      },

      expand: () => {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch {
          // ignore web / unsupported
        }
        set({ isExpanded: true, isMinimized: false });
      },

      collapse: () => {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch {
          // ignore
        }
        set({ isExpanded: false });
      },

      toggleExpand: () => {
        const next = !get().isExpanded;
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch {
          // ignore
        }
        set({ isExpanded: next, isMinimized: false });
      },

      minimize: () => {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch {
          // ignore
        }
        set({ isMinimized: true, isExpanded: false });
      },

      restore: () => {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch {
          // ignore
        }
        set({ isMinimized: false, isDismissed: false });
      },

      dismiss: (_snoozeMinutes?: number) => {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } catch {
          // ignore
        }
        set({ isDismissed: true, isExpanded: false, dismissedAt: Date.now() });
      },

      undismiss: () => {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch {
          // ignore
        }
        set({ isDismissed: false, dismissedAt: null });
      },

      setDockPosition: (pos: { x: number; y: number }) => {
        set({ dockPosition: pos });
      },

      resetDockPosition: () => {
        set({ dockPosition: { x: 0, y: 0 } });
      },

      triggerKeylessEntry: async (): Promise<boolean> => {
        const { checkInDay } = get();
        if (checkInDay.keylessEntry.state === "transmitting") {
          return false;
        }

        // Initial haptic tap
        try {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        } catch {
          // ignore
        }

        // 1. Transmitting / BLE proximity handshake
        set({
          checkInDay: {
            ...checkInDay,
            keylessEntry: {
              ...checkInDay.keylessEntry,
              state: "transmitting",
            },
          },
        });

        // Simulate NFC transmission delay (1100ms)
        await new Promise((resolve) => setTimeout(resolve, 1100));

        // 2. Unlocked success!
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {
          // ignore
        }

        set({
          checkInDay: {
            ...get().checkInDay,
            roomStatus: "checked_in",
            keylessEntry: {
              ...get().checkInDay.keylessEntry,
              state: "unlocked",
              lastUnlockedAt: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              }),
            },
          },
        });

        // 3. Reset back to idle state after 4 seconds
        setTimeout(() => {
          const currentHotel = get().checkInDay;
          if (currentHotel.keylessEntry.state === "unlocked") {
            set({
              checkInDay: {
                ...currentHotel,
                keylessEntry: {
                  ...currentHotel.keylessEntry,
                  state: "idle",
                },
              },
            });
          }
        }, 4000);

        return true;
      },

      updateGate: (gate: string) => {
        set({
          preDeparture: {
            ...get().preDeparture,
            gate,
          },
        });
      },

      updateBoardingStatus: (status: BoardingStatus) => {
        set({
          preDeparture: {
            ...get().preDeparture,
            boardingStatus: status,
          },
        });
      },

      updateWeather: (weather: Partial<InTripActivityData["localWeather"]>) => {
        set({
          inTrip: {
            ...get().inTrip,
            localWeather: {
              ...get().inTrip.localWeather,
              ...weather,
            },
          },
        });
      },

      updateRoomStatus: (status: HotelRoomStatus) => {
        set({
          checkInDay: {
            ...get().checkInDay,
            roomStatus: status,
          },
        });
      },

      setPreDepartureData: (data: Partial<FlightBusTripData>) => {
        set({
          preDeparture: {
            ...get().preDeparture,
            ...data,
          },
        });
      },

      setInTripData: (data: Partial<InTripActivityData>) => {
        set({
          inTrip: {
            ...get().inTrip,
            ...data,
          },
        });
      },

      setCheckInData: (data: Partial<HotelCheckInData>) => {
        set({
          checkInDay: {
            ...get().checkInDay,
            ...data,
          },
        });
      },

      resetToMockData: () => {
        set({
          preDeparture: DEFAULT_PRE_DEPARTURE_DATA,
          inTrip: DEFAULT_IN_TRIP_DATA,
          checkInDay: DEFAULT_CHECK_IN_DATA,
          isExpanded: false,
          isMinimized: false,
          isDismissed: false,
          dockPosition: { x: 0, y: 0 },
        });
      },
    }),
    {
      name: "active-trip-dock-storage",
      storage: createJSONStorage(() => cachedStateStorage),
      // Only persist stable configuration, not volatile animation states
      partialize: (state) => ({
        mode: state.mode,
        autoMorph: state.autoMorph,
        dockPosition: state.dockPosition,
        preDeparture: state.preDeparture,
        inTrip: state.inTrip,
        checkInDay: {
          ...state.checkInDay,
          keylessEntry: {
            ...state.checkInDay.keylessEntry,
            state: "idle",
          },
        },
      }),
    }
  )
);
