/**
 * Travel Store (Zustand)
 * Global search state, multi-vertical search filters, sorting, recent searches, and inventory results.
 */

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { travelRepository } from "../repositories";
import {
  FlightSearchFilters,
  FlightSearchResult,
  HotelSearchFilters,
  HotelSearchResult,
  TourSearchResult,
  TrainSearchFilters,
  TrainSearchResult,
} from "../repositories/types";
import { cachedStateStorage } from "./storage";

export type TravelTab = "flights" | "hotels" | "trains" | "tours";
export type SortOption = "price" | "rating" | "duration" | "departureTime";
export type SortOrder = "asc" | "desc";

export interface RecentSearchItem {
  id: string;
  tab: TravelTab;
  title: string;
  subtitle: string;
  filters: Record<string, any>;
  timestamp: number;
}

export interface TravelFiltersState {
  activeTab: TravelTab;

  // Sorting
  sortBy: SortOption;
  sortOrder: SortOrder;

  // Vertical Filters
  flightFilters: FlightSearchFilters;
  hotelFilters: HotelSearchFilters;
  trainFilters: TrainSearchFilters;
  tourFilters: {
    destination?: string;
    minPrice?: number;
    maxPrice?: number;
    difficultyLevel?: string;
    durationDays?: number;
  };

  // Search Results
  searchResults: {
    flights: FlightSearchResult[];
    hotels: HotelSearchResult[];
    trains: TrainSearchResult[];
    tours: TourSearchResult[];
  };

  // Status
  isSearching: boolean;
  searchError: string | null;

  // Recent Searches
  recentSearches: RecentSearchItem[];

  // Actions
  setActiveTab: (tab: TravelTab) => void;
  setSorting: (sortBy: SortOption, sortOrder?: SortOrder) => void;
  setFlightFilters: (filters: Partial<FlightSearchFilters>) => void;
  setHotelFilters: (filters: Partial<HotelSearchFilters>) => void;
  setTrainFilters: (filters: Partial<TrainSearchFilters>) => void;
  setTourFilters: (filters: Partial<TravelFiltersState["tourFilters"]>) => void;
  resetFilters: (tab?: TravelTab) => void;
  executeSearch: (tab?: TravelTab, bypassCache?: boolean) => Promise<void>;
  addRecentSearch: (item: Omit<RecentSearchItem, "id" | "timestamp">) => void;
  clearRecentSearches: () => void;
}

const DEFAULT_FLIGHT_FILTERS: FlightSearchFilters = {
  originCode: "DAC",
  destinationCode: "CXB",
  passengers: 1,
  cabinClass: "economy",
  isDirect: false,
};

const DEFAULT_HOTEL_FILTERS: HotelSearchFilters = {
  city: "Cox's Bazar",
  guestsCount: 2,
  roomsCount: 1,
  minRating: 4,
};

const DEFAULT_TRAIN_FILTERS: TrainSearchFilters = {
  departureCity: "Dhaka",
  arrivalCity: "Chittagong",
  travelClass: "SNIGDHA",
};

const DEFAULT_TOUR_FILTERS = {
  destination: "",
  minPrice: 0,
  maxPrice: 50000,
};

export const useTravelStore = create<TravelFiltersState>()(
  persist(
    (set, get) => ({
      activeTab: "flights",
      sortBy: "price",
      sortOrder: "asc",

      flightFilters: { ...DEFAULT_FLIGHT_FILTERS },
      hotelFilters: { ...DEFAULT_HOTEL_FILTERS },
      trainFilters: { ...DEFAULT_TRAIN_FILTERS },
      tourFilters: { ...DEFAULT_TOUR_FILTERS },

      searchResults: {
        flights: [],
        hotels: [],
        trains: [],
        tours: [],
      },

      isSearching: false,
      searchError: null,
      recentSearches: [],

      setActiveTab: (activeTab) => set({ activeTab, searchError: null }),

      setSorting: (sortBy, sortOrder = "asc") => set({ sortBy, sortOrder }),

      setFlightFilters: (filters) =>
        set((state) => ({
          flightFilters: { ...state.flightFilters, ...filters },
        })),

      setHotelFilters: (filters) =>
        set((state) => ({
          hotelFilters: { ...state.hotelFilters, ...filters },
        })),

      setTrainFilters: (filters) =>
        set((state) => ({
          trainFilters: { ...state.trainFilters, ...filters },
        })),

      setTourFilters: (filters) =>
        set((state) => ({
          tourFilters: { ...state.tourFilters, ...filters },
        })),

      resetFilters: (tab) => {
        const targetTab = tab || get().activeTab;
        if (targetTab === "flights") {
          set({ flightFilters: { ...DEFAULT_FLIGHT_FILTERS } });
        } else if (targetTab === "hotels") {
          set({ hotelFilters: { ...DEFAULT_HOTEL_FILTERS } });
        } else if (targetTab === "trains") {
          set({ trainFilters: { ...DEFAULT_TRAIN_FILTERS } });
        } else if (targetTab === "tours") {
          set({ tourFilters: { ...DEFAULT_TOUR_FILTERS } });
        }
      },

      executeSearch: async (tab, bypassCache = false) => {
        const targetTab = tab || get().activeTab;
        set({ isSearching: true, searchError: null });

        try {
          if (targetTab === "flights") {
            const results = await travelRepository.searchFlights(
              get().flightFilters,
              { bypassCache },
            );
            set((state) => ({
              searchResults: { ...state.searchResults, flights: results },
              isSearching: false,
            }));
            get().addRecentSearch({
              tab: "flights",
              title: `${get().flightFilters.originCode || "DAC"} → ${get().flightFilters.destinationCode || "CXB"}`,
              subtitle: `${get().flightFilters.passengers || 1} Traveler(s) · ${get().flightFilters.cabinClass || "Economy"}`,
              filters: get().flightFilters,
            });
          } else if (targetTab === "hotels") {
            const results = await travelRepository.searchHotels(
              get().hotelFilters,
              { bypassCache },
            );
            set((state) => ({
              searchResults: { ...state.searchResults, hotels: results },
              isSearching: false,
            }));
            get().addRecentSearch({
              tab: "hotels",
              title: `Hotels in ${get().hotelFilters.city || "Cox's Bazar"}`,
              subtitle: `${get().hotelFilters.guestsCount || 2} Guests · ${get().hotelFilters.roomsCount || 1} Room(s)`,
              filters: get().hotelFilters,
            });
          } else if (targetTab === "trains") {
            const results = await travelRepository.searchTrains(
              get().trainFilters,
              { bypassCache },
            );
            set((state) => ({
              searchResults: { ...state.searchResults, trains: results },
              isSearching: false,
            }));
            get().addRecentSearch({
              tab: "trains",
              title: `${get().trainFilters.departureCity || "Dhaka"} → ${get().trainFilters.arrivalCity || "Chittagong"}`,
              subtitle: `Train · ${get().trainFilters.travelClass || "Snigdha"}`,
              filters: get().trainFilters,
            });
          } else if (targetTab === "tours") {
            const results = await travelRepository.getFeaturedTours(20, {
              bypassCache,
            });
            set((state) => ({
              searchResults: { ...state.searchResults, tours: results },
              isSearching: false,
            }));
          }
        } catch (err: any) {
          set({
            isSearching: false,
            searchError: err?.message || "Search failed. Please try again.",
          });
        }
      },

      addRecentSearch: (item) => {
        const newSearch: RecentSearchItem = {
          ...item,
          id: `search-${Date.now()}`,
          timestamp: Date.now(),
        };

        set((state) => {
          // Keep max 10 recent searches, remove duplicates
          const filtered = state.recentSearches.filter(
            (s) => s.title !== item.title || s.tab !== item.tab,
          );
          return {
            recentSearches: [newSearch, ...filtered].slice(0, 10),
          };
        });
      },

      clearRecentSearches: () => set({ recentSearches: [] }),
    }),
    {
      name: "travel_search_store",
      storage: createJSONStorage(() => cachedStateStorage),
      partialize: (state) => ({
        activeTab: state.activeTab,
        flightFilters: state.flightFilters,
        hotelFilters: state.hotelFilters,
        trainFilters: state.trainFilters,
        tourFilters: state.tourFilters,
        sortBy: state.sortBy,
        sortOrder: state.sortOrder,
        recentSearches: state.recentSearches,
      }),
    },
  ),
);
