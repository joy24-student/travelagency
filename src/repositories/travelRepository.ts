/**
 * Travel Repository
 * High-performance inventory search with LRU memory caching & query debouncing.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "../utils/supabase";
import { BaseRepository } from "./baseRepository";
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
} from "./types";

// ============================================================================
// IN-MEMORY LRU & TTL CACHE ENGINE
// ============================================================================

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  lastAccessed: number;
}

class QueryMemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly maxEntries: number;
  private readonly defaultTtlMs: number;

  constructor(maxEntries = 150, defaultTtlMs = 180000) {
    // default 3 minutes TTL
    this.maxEntries = maxEntries;
    this.defaultTtlMs = defaultTtlMs;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    entry.lastAccessed = Date.now();
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs?: number): void {
    if (this.cache.size >= this.maxEntries) {
      // LRU Eviction: delete oldest accessed item
      let oldestKey: string | null = null;
      let oldestAccess = Infinity;

      this.cache.forEach((v, k) => {
        if (v.lastAccessed < oldestAccess) {
          oldestAccess = v.lastAccessed;
          oldestKey = k;
        }
      });

      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    const ttl = ttlMs || this.defaultTtlMs;
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttl,
      lastAccessed: Date.now(),
    });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// ============================================================================
// QUERY DEBOUNCER
// ============================================================================

class QueryDebouncer {
  private timers = new Map<string, ReturnType<typeof setTimeout>>();

  debounce<T>(key: string, fn: () => Promise<T>, waitMs = 300): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const existing = this.timers.get(key);
      if (existing) {
        clearTimeout(existing);
      }

      const timer = setTimeout(async () => {
        this.timers.delete(key);
        try {
          const result = await fn();
          resolve(result);
        } catch (err) {
          reject(err);
        }
      }, waitMs);

      this.timers.set(key, timer);
    });
  }

  cancel(key?: string): void {
    if (key) {
      const timer = this.timers.get(key);
      if (timer) {
        clearTimeout(timer);
        this.timers.delete(key);
      }
    } else {
      this.timers.forEach((timer) => {
        clearTimeout(timer);
      });
      this.timers.clear();
    }
  }
}

// ============================================================================
// TRAVEL REPOSITORY IMPLEMENTATION
// ============================================================================

export class TravelRepository
  extends BaseRepository<any>
  implements ITravelRepository
{
  private readonly memoryCache: QueryMemoryCache;
  private readonly debouncer: QueryDebouncer;

  constructor(customClient?: SupabaseClient) {
    super("destinations", "*", customClient);
    this.memoryCache = new QueryMemoryCache(200, 300000); // 5 min TTL
    this.debouncer = new QueryDebouncer();
  }

  private hashKey(prefix: string, params: Record<string, any>): string {
    return `${prefix}:${JSON.stringify(params, Object.keys(params).sort())}`;
  }

  // ==========================================================================
  // FLIGHTS SEARCH
  // ==========================================================================

  async searchFlights(
    filters: FlightSearchFilters,
    options?: CacheOptions,
  ): Promise<FlightSearchResult[]> {
    const cacheKey = this.hashKey("flights", filters);

    if (!options?.bypassCache) {
      const cached = this.memoryCache.get<FlightSearchResult[]>(cacheKey);
      if (cached) return cached;
    }

    try {
      let depId = filters.departureAirportId;
      let arrId = filters.arrivalAirportId;

      // Resolve IATA airport codes to IDs if not provided
      if (!depId && filters.originCode) {
        const { data: depAirport } = await this.client
          .from("airports")
          .select("id")
          .eq("iata_code", filters.originCode.toUpperCase())
          .maybeSingle();
        if (depAirport) depId = depAirport.id;
      }

      if (!arrId && filters.destinationCode) {
        const { data: arrAirport } = await this.client
          .from("airports")
          .select("id")
          .eq("iata_code", filters.destinationCode.toUpperCase())
          .maybeSingle();
        if (arrAirport) arrId = arrAirport.id;
      }

      let query = this.client.from("flights").select(`
        *,
        departure_airport:airports!departure_airport_id(id, name, iata_code, city),
        arrival_airport:airports!arrival_airport_id(id, name, iata_code, city),
        airline:airlines(id, name, iata_code, logo_url)
      `);

      if (depId) {
        query = query.eq("departure_airport_id", depId);
      }
      if (arrId) {
        query = query.eq("arrival_airport_id", arrId);
      }
      if (filters.departureDate) {
        query = query.gte("departure_time", filters.departureDate);
      }
      if (filters.cabinClass) {
        query = query.ilike("cabin_class", filters.cabinClass);
      }
      if (filters.minPrice !== undefined) {
        query = query.gte("base_price", filters.minPrice);
      }
      if (filters.maxPrice !== undefined) {
        query = query.lte("base_price", filters.maxPrice);
      }
      if (filters.isDirect !== undefined) {
        query = query.eq("is_direct", filters.isDirect);
      }

      const { data, error } = await query
        .order("base_price", { ascending: true })
        .limit(50);

      if (error) {
        throw this.normalizeError(error, "searchFlights");
      }

      const results: FlightSearchResult[] = (data || []).map((f: any) => ({
        id: f.id,
        flight_number: f.flight_number || "FL-000",
        airline_name: f.airline?.name || f.airline_name || "Airline",
        airline_code: f.airline?.iata_code,
        airline_logo: f.airline?.logo_url,
        departure_airport_code: f.departure_airport?.iata_code || f.departure_airport_code || "",
        departure_city: f.departure_airport?.city || f.departure_city || "",
        arrival_airport_code: f.arrival_airport?.iata_code || f.arrival_airport_code || "",
        arrival_city: f.arrival_airport?.city || f.arrival_city || "",
        departure_time: f.departure_time,
        arrival_time: f.arrival_time,
        duration_minutes: f.duration_minutes || 0,
        cabin_class: f.cabin_class || "economy",
        base_price: Number(f.base_price || 0),
        tax_amount: Number(f.tax_amount || 0),
        total_price: Number(f.total_price || f.base_price || 0),
        currency: f.currency || "BDT",
        seats_available: Number(f.available_seats || f.seats_available || 9),
        is_direct: f.is_direct ?? (f.stops_count === 0),
        stops_count: Number(f.stops_count || 0),
      }));

      this.memoryCache.set(cacheKey, results, options?.ttlMs);
      return results;
    } catch (err) {
      throw this.normalizeError(err, "searchFlights");
    }
  }

  searchFlightsDebounced(
    filters: FlightSearchFilters,
    waitMs = 300,
  ): Promise<FlightSearchResult[]> {
    const key = this.hashKey("debounced_flights", filters);
    return this.debouncer.debounce(key, () => this.searchFlights(filters), waitMs);
  }

  // ==========================================================================
  // HOTELS SEARCH
  // ==========================================================================

  async searchHotels(
    filters: HotelSearchFilters,
    options?: CacheOptions,
  ): Promise<HotelSearchResult[]> {
    const cacheKey = this.hashKey("hotels", filters);

    if (!options?.bypassCache) {
      const cached = this.memoryCache.get<HotelSearchResult[]>(cacheKey);
      if (cached) return cached;
    }

    try {
      let query = this.client.from("hotels").select(`
        *,
        hotel_rooms(id, room_type, price_per_night, is_available)
      `);

      if (filters.city) {
        query = query.ilike("city", `%${filters.city}%`);
      }
      if (filters.country) {
        query = query.ilike("country_code", filters.country);
      }
      if (filters.destinationId) {
        query = query.eq("destination_id", filters.destinationId);
      }
      if (filters.minRating !== undefined) {
        query = query.gte("average_rating", filters.minRating);
      }
      if (filters.minPrice !== undefined) {
        query = query.gte("price_per_night", filters.minPrice);
      }
      if (filters.maxPrice !== undefined) {
        query = query.lte("price_per_night", filters.maxPrice);
      }

      const { data, error } = await query
        .order("average_rating", { ascending: false })
        .limit(50);

      if (error) {
        throw this.normalizeError(error, "searchHotels");
      }

      const results: HotelSearchResult[] = (data || []).map((h: any) => ({
        id: h.id,
        name: h.name,
        city: h.city,
        country: h.country_code || h.country || "",
        address: h.address,
        star_rating: Number(h.star_rating || 3),
        average_rating: Number(h.average_rating || 4.0),
        reviews_count: Number(h.reviews_count || 0),
        featured_image:
          h.featured_image ||
          h.main_image_url ||
          "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600",
        images: Array.isArray(h.images) ? h.images : [],
        price_per_night: Number(h.price_per_night || 0),
        currency: h.currency || "BDT",
        amenities: Array.isArray(h.amenities) ? h.amenities : ["WiFi", "AC", "Breakfast"],
        is_free_cancellation: Boolean(h.is_free_cancellation ?? true),
        latitude: h.latitude ? Number(h.latitude) : undefined,
        longitude: h.longitude ? Number(h.longitude) : undefined,
      }));

      this.memoryCache.set(cacheKey, results, options?.ttlMs);
      return results;
    } catch (err) {
      throw this.normalizeError(err, "searchHotels");
    }
  }

  searchHotelsDebounced(
    filters: HotelSearchFilters,
    waitMs = 300,
  ): Promise<HotelSearchResult[]> {
    const key = this.hashKey("debounced_hotels", filters);
    return this.debouncer.debounce(key, () => this.searchHotels(filters), waitMs);
  }

  // ==========================================================================
  // TRAINS SEARCH
  // ==========================================================================

  async searchTrains(
    filters: TrainSearchFilters,
    options?: CacheOptions,
  ): Promise<TrainSearchResult[]> {
    const cacheKey = this.hashKey("trains", filters);

    if (!options?.bypassCache) {
      const cached = this.memoryCache.get<TrainSearchResult[]>(cacheKey);
      if (cached) return cached;
    }

    try {
      let query = this.client.from("trains").select("*");

      if (filters.departureCity) {
        query = query.ilike("departure_city", `%${filters.departureCity}%`);
      }
      if (filters.arrivalCity) {
        query = query.ilike("arrival_city", `%${filters.arrivalCity}%`);
      }
      if (filters.trainType) {
        query = query.eq("train_type", filters.trainType);
      }
      if (filters.travelClass) {
        query = query.eq("travel_class", filters.travelClass);
      }

      const { data, error } = await query
        .order("departure_time", { ascending: true })
        .limit(50);

      if (error) {
        throw this.normalizeError(error, "searchTrains");
      }

      const results: TrainSearchResult[] = (data || []).map((t: any) => ({
        id: t.id,
        train_number: t.train_number || "TR-001",
        train_name: t.train_name || "Express",
        departure_city: t.departure_city,
        departure_station: t.departure_station || t.departure_city,
        arrival_city: t.arrival_city,
        arrival_station: t.arrival_station || t.arrival_city,
        departure_time: t.departure_time,
        arrival_time: t.arrival_time,
        duration_minutes: Number(t.duration_minutes || 0),
        train_type: t.train_type || "Intercity",
        fare_amount: Number(t.fare_amount || t.base_fare || 0),
        currency: t.currency || "BDT",
        available_seats: Number(t.available_seats || 50),
        travel_class: t.travel_class || "SHOVAN_CHAIR",
      }));

      this.memoryCache.set(cacheKey, results, options?.ttlMs);
      return results;
    } catch (err) {
      throw this.normalizeError(err, "searchTrains");
    }
  }

  searchTrainsDebounced(
    filters: TrainSearchFilters,
    waitMs = 300,
  ): Promise<TrainSearchResult[]> {
    const key = this.hashKey("debounced_trains", filters);
    return this.debouncer.debounce(key, () => this.searchTrains(filters), waitMs);
  }

  // ==========================================================================
  // FEATURED TOURS
  // ==========================================================================

  async getFeaturedTours(
    limit = 20,
    options?: CacheOptions,
  ): Promise<TourSearchResult[]> {
    const cacheKey = `tours:featured:${limit}`;

    if (!options?.bypassCache) {
      const cached = this.memoryCache.get<TourSearchResult[]>(cacheKey);
      if (cached) return cached;
    }

    try {
      const { data, error } = await this.client
        .from("tours")
        .select("*")
        .order("rating", { ascending: false })
        .limit(limit);

      if (error) {
        throw this.normalizeError(error, "getFeaturedTours");
      }

      const results: TourSearchResult[] = (data || []).map((tour: any) => ({
        id: tour.id,
        title: tour.title || tour.name || "Adventure Tour",
        destination_city: tour.destination_city || tour.city || "",
        destination_country: tour.destination_country || tour.country,
        duration_days: Number(tour.duration_days || 1),
        duration_nights: tour.duration_nights ? Number(tour.duration_nights) : undefined,
        price_per_person: Number(tour.price_per_person || tour.base_price || 0),
        currency: tour.currency || "BDT",
        difficulty_level: tour.difficulty_level || "Moderate",
        featured_image:
          tour.featured_image ||
          tour.image_url ||
          "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600",
        rating: Number(tour.rating || 4.5),
        reviews_count: Number(tour.reviews_count || 0),
        is_featured: Boolean(tour.is_featured ?? true),
        max_group_size: Number(tour.max_group_size || 15),
        highlights: Array.isArray(tour.highlights) ? tour.highlights : [],
      }));

      this.memoryCache.set(cacheKey, results, options?.ttlMs || 600000); // 10 min TTL
      return results;
    } catch (err) {
      throw this.normalizeError(err, "getFeaturedTours");
    }
  }

  // ==========================================================================
  // DETAILS LOOKUPS
  // ==========================================================================

  async getFlightById(id: string): Promise<FlightSearchResult | null> {
    try {
      const { data, error } = await this.client
        .from("flights")
        .select(`
          *,
          departure_airport:airports!departure_airport_id(id, name, iata_code, city),
          arrival_airport:airports!arrival_airport_id(id, name, iata_code, city),
          airline:airlines(id, name, iata_code, logo_url)
        `)
        .eq("id", id)
        .maybeSingle();

      if (error) throw this.normalizeError(error, `getFlightById(${id})`);
      if (!data) return null;

      return {
        id: data.id,
        flight_number: data.flight_number,
        airline_name: data.airline?.name || "Airline",
        airline_code: data.airline?.iata_code,
        airline_logo: data.airline?.logo_url,
        departure_airport_code: data.departure_airport?.iata_code || "",
        departure_city: data.departure_airport?.city || "",
        arrival_airport_code: data.arrival_airport?.iata_code || "",
        arrival_city: data.arrival_airport?.city || "",
        departure_time: data.departure_time,
        arrival_time: data.arrival_time,
        duration_minutes: Number(data.duration_minutes || 0),
        cabin_class: data.cabin_class || "economy",
        base_price: Number(data.base_price || 0),
        tax_amount: Number(data.tax_amount || 0),
        total_price: Number(data.total_price || data.base_price || 0),
        currency: data.currency || "BDT",
        seats_available: Number(data.available_seats || 9),
        is_direct: data.is_direct ?? true,
        stops_count: Number(data.stops_count || 0),
      };
    } catch (err) {
      throw this.normalizeError(err, `getFlightById(${id})`);
    }
  }

  async getHotelById(id: string): Promise<HotelSearchResult | null> {
    try {
      const { data, error } = await this.client
        .from("hotels")
        .select(`*, hotel_rooms(*)`)
        .eq("id", id)
        .maybeSingle();

      if (error) throw this.normalizeError(error, `getHotelById(${id})`);
      if (!data) return null;

      return {
        id: data.id,
        name: data.name,
        city: data.city,
        country: data.country_code || data.country || "",
        address: data.address,
        star_rating: Number(data.star_rating || 3),
        average_rating: Number(data.average_rating || 4.0),
        reviews_count: Number(data.reviews_count || 0),
        featured_image: data.featured_image || data.main_image_url || "",
        images: Array.isArray(data.images) ? data.images : [],
        price_per_night: Number(data.price_per_night || 0),
        currency: data.currency || "BDT",
        amenities: Array.isArray(data.amenities) ? data.amenities : [],
        is_free_cancellation: Boolean(data.is_free_cancellation ?? true),
        latitude: data.latitude ? Number(data.latitude) : undefined,
        longitude: data.longitude ? Number(data.longitude) : undefined,
      };
    } catch (err) {
      throw this.normalizeError(err, `getHotelById(${id})`);
    }
  }

  async getTrainById(id: string): Promise<TrainSearchResult | null> {
    try {
      const { data, error } = await this.client
        .from("trains")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw this.normalizeError(error, `getTrainById(${id})`);
      if (!data) return null;

      return {
        id: data.id,
        train_number: data.train_number,
        train_name: data.train_name,
        departure_city: data.departure_city,
        departure_station: data.departure_station || data.departure_city,
        arrival_city: data.arrival_city,
        arrival_station: data.arrival_station || data.arrival_city,
        departure_time: data.departure_time,
        arrival_time: data.arrival_time,
        duration_minutes: Number(data.duration_minutes || 0),
        train_type: data.train_type || "Intercity",
        fare_amount: Number(data.fare_amount || 0),
        currency: data.currency || "BDT",
        available_seats: Number(data.available_seats || 50),
        travel_class: data.travel_class || "SHOVAN_CHAIR",
      };
    } catch (err) {
      throw this.normalizeError(err, `getTrainById(${id})`);
    }
  }

  async getTourById(id: string): Promise<TourSearchResult | null> {
    try {
      const { data, error } = await this.client
        .from("tours")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw this.normalizeError(error, `getTourById(${id})`);
      if (!data) return null;

      return {
        id: data.id,
        title: data.title || data.name,
        destination_city: data.destination_city || "",
        destination_country: data.destination_country,
        duration_days: Number(data.duration_days || 1),
        duration_nights: data.duration_nights ? Number(data.duration_nights) : undefined,
        price_per_person: Number(data.price_per_person || data.base_price || 0),
        currency: data.currency || "BDT",
        difficulty_level: data.difficulty_level || "Moderate",
        featured_image: data.featured_image || data.image_url || "",
        rating: Number(data.rating || 4.5),
        reviews_count: Number(data.reviews_count || 0),
        is_featured: Boolean(data.is_featured ?? true),
        max_group_size: Number(data.max_group_size || 15),
        highlights: Array.isArray(data.highlights) ? data.highlights : [],
      };
    } catch (err) {
      throw this.normalizeError(err, `getTourById(${id})`);
    }
  }

  clearCache(): void {
    this.memoryCache.clear();
    this.debouncer.cancel();
  }
}
