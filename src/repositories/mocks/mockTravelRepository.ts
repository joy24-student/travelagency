/**
 * Mock Travel Repository
 * Offline unit test mock with realistic fixtures & simulated latency/error injection.
 */

import {
  CacheOptions,
  FlightSearchFilters,
  FlightSearchResult,
  HotelSearchFilters,
  HotelSearchResult,
  ITravelRepository,
  TourSearchResult,
  TrainSearchFilters,
  TrainSearchResult,
} from "../types";

export const MOCK_FLIGHTS: FlightSearchResult[] = [
  {
    id: "fl-001",
    flight_number: "BG-435",
    airline_name: "Biman Bangladesh Airlines",
    airline_code: "BG",
    departure_airport_code: "DAC",
    departure_city: "Dhaka",
    arrival_airport_code: "CXB",
    arrival_city: "Cox's Bazar",
    departure_time: "2026-11-10T09:30:00Z",
    arrival_time: "2026-11-10T10:35:00Z",
    duration_minutes: 65,
    cabin_class: "economy",
    base_price: 4500,
    tax_amount: 500,
    total_price: 5000,
    currency: "BDT",
    seats_available: 12,
    is_direct: true,
    stops_count: 0,
  },
  {
    id: "fl-002",
    flight_number: "BS-141",
    airline_name: "US-Bangla Airlines",
    airline_code: "BS",
    departure_airport_code: "DAC",
    departure_city: "Dhaka",
    arrival_airport_code: "CGP",
    arrival_city: "Chittagong",
    departure_time: "2026-11-10T14:00:00Z",
    arrival_time: "2026-11-10T14:45:00Z",
    duration_minutes: 45,
    cabin_class: "business",
    base_price: 8500,
    tax_amount: 800,
    total_price: 9300,
    currency: "BDT",
    seats_available: 4,
    is_direct: true,
    stops_count: 0,
  },
];

export const MOCK_HOTELS: HotelSearchResult[] = [
  {
    id: "ht-001",
    name: "Sayeman Beach Resort",
    city: "Cox's Bazar",
    country: "Bangladesh",
    address: "Marine Drive Road, Kolatoli, Cox's Bazar",
    star_rating: 5,
    average_rating: 4.8,
    reviews_count: 320,
    featured_image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600",
    images: ["https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600"],
    price_per_night: 11500,
    currency: "BDT",
    amenities: ["Ocean View", "Infinity Pool", "Free Breakfast", "Spa", "Free WiFi"],
    is_free_cancellation: true,
    latitude: 21.4272,
    longitude: 91.9702,
  },
  {
    id: "ht-002",
    name: "The Westin Dhaka",
    city: "Dhaka",
    country: "Bangladesh",
    address: "Gulshan-2, Dhaka",
    star_rating: 5,
    average_rating: 4.7,
    reviews_count: 450,
    featured_image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600",
    images: ["https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600"],
    price_per_night: 16500,
    currency: "BDT",
    amenities: ["Rooftop Pool", "Fitness Center", "Fine Dining", "Valet Parking"],
    is_free_cancellation: true,
    latitude: 23.7937,
    longitude: 90.4144,
  },
];

export const MOCK_TRAINS: TrainSearchResult[] = [
  {
    id: "tr-001",
    train_number: "701",
    train_name: "Suborno Express",
    departure_city: "Dhaka",
    departure_station: "Kamalapur Railway Station",
    arrival_city: "Chittagong",
    arrival_station: "Chittagong Railway Station",
    departure_time: "2026-11-10T07:00:00Z",
    arrival_time: "2026-11-10T12:30:00Z",
    duration_minutes: 330,
    train_type: "Non-Stop Intercity",
    fare_amount: 850,
    currency: "BDT",
    available_seats: 48,
    travel_class: "SNIGDHA",
  },
];

export const MOCK_TOURS: TourSearchResult[] = [
  {
    id: "tour-001",
    title: "Sundarbans Wilderness & Royal Bengal Tiger Safari",
    destination_city: "Khulna / Mongla",
    destination_country: "Bangladesh",
    duration_days: 3,
    duration_nights: 2,
    price_per_person: 14500,
    currency: "BDT",
    difficulty_level: "Easy to Moderate",
    featured_image: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600",
    rating: 4.9,
    reviews_count: 142,
    is_featured: true,
    max_group_size: 16,
    highlights: ["Houseboat Stay", "Canal Cruise", "Watchtower Trek", "Birdwatching"],
  },
];

export class MockTravelRepository implements ITravelRepository {
  public simulatedLatencyMs = 10;
  public shouldFail = false;
  public failureMessage = "Simulated network failure";

  private async delay(): Promise<void> {
    if (this.simulatedLatencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.simulatedLatencyMs));
    }
    if (this.shouldFail) {
      throw new Error(this.failureMessage);
    }
  }

  async searchFlights(
    filters: FlightSearchFilters,
    _options?: CacheOptions,
  ): Promise<FlightSearchResult[]> {
    await this.delay();
    return MOCK_FLIGHTS.filter((f) => {
      if (filters.originCode && f.departure_airport_code !== filters.originCode.toUpperCase()) {
        return false;
      }
      if (
        filters.destinationCode &&
        f.arrival_airport_code !== filters.destinationCode.toUpperCase()
      ) {
        return false;
      }
      if (filters.maxPrice && f.total_price > filters.maxPrice) {
        return false;
      }
      return true;
    });
  }

  async searchFlightsDebounced(
    filters: FlightSearchFilters,
    _waitMs?: number,
  ): Promise<FlightSearchResult[]> {
    return this.searchFlights(filters);
  }

  async searchHotels(
    filters: HotelSearchFilters,
    _options?: CacheOptions,
  ): Promise<HotelSearchResult[]> {
    await this.delay();
    return MOCK_HOTELS.filter((h) => {
      if (filters.city && !h.city.toLowerCase().includes(filters.city.toLowerCase())) {
        return false;
      }
      if (filters.maxPrice && h.price_per_night > filters.maxPrice) {
        return false;
      }
      if (filters.minRating && h.average_rating < filters.minRating) {
        return false;
      }
      return true;
    });
  }

  async searchHotelsDebounced(
    filters: HotelSearchFilters,
    _waitMs?: number,
  ): Promise<HotelSearchResult[]> {
    return this.searchHotels(filters);
  }

  async searchTrains(
    filters: TrainSearchFilters,
    _options?: CacheOptions,
  ): Promise<TrainSearchResult[]> {
    await this.delay();
    return MOCK_TRAINS.filter((t) => {
      if (
        filters.departureCity &&
        !t.departure_city.toLowerCase().includes(filters.departureCity.toLowerCase())
      ) {
        return false;
      }
      if (
        filters.arrivalCity &&
        !t.arrival_city.toLowerCase().includes(filters.arrivalCity.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }

  async searchTrainsDebounced(
    filters: TrainSearchFilters,
    _waitMs?: number,
  ): Promise<TrainSearchResult[]> {
    return this.searchTrains(filters);
  }

  async getFeaturedTours(
    limit = 10,
    _options?: CacheOptions,
  ): Promise<TourSearchResult[]> {
    await this.delay();
    return MOCK_TOURS.slice(0, limit);
  }

  async getFlightById(id: string): Promise<FlightSearchResult | null> {
    await this.delay();
    return MOCK_FLIGHTS.find((f) => f.id === id) || null;
  }

  async getHotelById(id: string): Promise<HotelSearchResult | null> {
    await this.delay();
    return MOCK_HOTELS.find((h) => h.id === id) || null;
  }

  async getTrainById(id: string): Promise<TrainSearchResult | null> {
    await this.delay();
    return MOCK_TRAINS.find((t) => t.id === id) || null;
  }

  async getTourById(id: string): Promise<TourSearchResult | null> {
    await this.delay();
    return MOCK_TOURS.find((t) => t.id === id) || null;
  }

  clearCache(): void {
    // No-op for mock
  }
}
