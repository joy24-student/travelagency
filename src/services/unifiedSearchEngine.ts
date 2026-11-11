import { supabase } from "../utils/supabase";
import { UnifiedSearchResult, SearchCategory } from "../types/heroBanner";
import { trendingSearchService } from "./trendingSearchService";

export const unifiedSearchEngine = {
  /**
   * Search across all travel entities in the database simultaneously
   */
  async searchEverything(
    rawQuery: string,
    filterCategory: SearchCategory = "all"
  ): Promise<UnifiedSearchResult[]> {
    const query = rawQuery.trim();
    if (!query) return [];

    const searchPattern = `%${query}%`;
    const results: UnifiedSearchResult[] = [];

    // Log the search asynchronously
    trendingSearchService.logSearch(query, filterCategory);

    try {
      // 1. Search Destinations
      if (filterCategory === "all" || filterCategory === "destinations") {
        const { data: destinations } = await supabase
          .from("destinations")
          .select("id, name, slug, country, image_url, description, is_trending")
          .or(`name.ilike.${searchPattern},country.ilike.${searchPattern},description.ilike.${searchPattern}`)
          .limit(5);

        if (destinations) {
          destinations.forEach((d) => {
            results.push({
              id: `dest-${d.id}`,
              title: d.name,
              subtitle: d.country ? `${d.country} • Popular Destination` : "Travel Destination",
              category: "destinations",
              categoryLabel: "Destination",
              imageUrl: d.image_url || "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300",
              badge: d.is_trending ? "HOT SPOT" : undefined,
              route: "/screens/search-stays",
              params: { destination: d.name },
            });
          });
        }
      }

      // 2. Search Hotels & Stays
      if (filterCategory === "all" || filterCategory === "hotels") {
        const { data: hotels } = await supabase
          .from("hotels")
          .select("id, name, city, star_rating, average_rating, base_price, currency, image_url, is_featured")
          .or(`name.ilike.${searchPattern},city.ilike.${searchPattern}`)
          .limit(6);

        if (hotels) {
          hotels.forEach((h) => {
            results.push({
              id: `hotel-${h.id}`,
              title: h.name,
              subtitle: `${h.city || "City"} • ${h.star_rating ? `${h.star_rating}★ Star` : "Luxury Hotel"}`,
              category: "hotels",
              categoryLabel: "Hotel & Stay",
              imageUrl: h.image_url || "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=300",
              price: h.base_price,
              currency: h.currency || "BDT",
              rating: h.average_rating || h.star_rating,
              badge: h.is_featured ? "TOP RATED" : undefined,
              route: "/screens/search-stays",
              params: { hotelId: h.id, q: h.name },
            });
          });
        }
      }

      // 3. Search Tours & Packages
      if (filterCategory === "all" || filterCategory === "tours" || filterCategory === "packages") {
        const { data: tours } = await supabase
          .from("tours")
          .select("id, title, destination_city, price, currency, duration_text, rating, image_urls, is_featured")
          .or(`title.ilike.${searchPattern},destination_city.ilike.${searchPattern}`)
          .limit(5);

        if (tours) {
          tours.forEach((t) => {
            const img = Array.isArray(t.image_urls) && t.image_urls.length > 0
              ? t.image_urls[0]
              : "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=300";

            results.push({
              id: `tour-${t.id}`,
              title: t.title,
              subtitle: `${t.destination_city || "Scenic Tour"} • ${t.duration_text || "Package"}`,
              category: "packages",
              categoryLabel: "Tour Package",
              imageUrl: img,
              price: t.price,
              currency: t.currency || "BDT",
              rating: t.rating,
              badge: t.is_featured ? "BESTSELLER" : undefined,
              route: "/screens/packages",
              params: { tourId: t.id, q: t.title },
            });
          });
        }
      }

      // 4. Search Itineraries
      if (filterCategory === "all" || filterCategory === "packages") {
        const { data: itineraries } = await supabase
          .from("itineraries")
          .select("id, title, destination, estimated_budget, currency, cover_image, rating")
          .or(`title.ilike.${searchPattern},destination.ilike.${searchPattern}`)
          .limit(4);

        if (itineraries) {
          itineraries.forEach((it) => {
            results.push({
              id: `itin-${it.id}`,
              title: it.title,
              subtitle: `${it.destination || "Tour"} • Itinerary Plan`,
              category: "packages",
              categoryLabel: "Itinerary Plan",
              imageUrl: it.cover_image || "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=300",
              price: it.estimated_budget,
              currency: it.currency || "BDT",
              rating: it.rating,
              route: "/screens/itinerary-details",
              params: { id: it.id },
            });
          });
        }
      }

      // 5. Search Trains
      if (filterCategory === "all" || filterCategory === "trains") {
        const { data: trains } = await supabase
          .from("trains")
          .select("id, train_name, train_number, departure_city, arrival_city, base_price, currency")
          .or(`train_name.ilike.${searchPattern},departure_city.ilike.${searchPattern},arrival_city.ilike.${searchPattern}`)
          .limit(4);

        if (trains) {
          trains.forEach((tr) => {
            results.push({
              id: `train-${tr.id}`,
              title: `${tr.train_name} (${tr.train_number || "Express"})`,
              subtitle: `${tr.departure_city || "From"} ➔ ${tr.arrival_city || "To"}`,
              category: "trains",
              categoryLabel: "Train Route",
              price: tr.base_price,
              currency: tr.currency || "BDT",
              route: "/screens/trains",
              params: { q: tr.train_name, from: tr.departure_city, to: tr.arrival_city },
            });
          });
        }
      }

      // 6. Search Flights
      if (filterCategory === "all" || filterCategory === "flights") {
        const { data: flights } = await supabase
          .from("flights")
          .select("id, flight_number, aircraft_type, cabin_class, base_price, currency")
          .or(`flight_number.ilike.${searchPattern},cabin_class.ilike.${searchPattern}`)
          .limit(3);

        if (flights) {
          flights.forEach((fl) => {
            results.push({
              id: `flight-${fl.id}`,
              title: `Flight ${fl.flight_number}`,
              subtitle: `${fl.aircraft_type || "Commercial Jet"} • ${fl.cabin_class || "Economy"}`,
              category: "flights",
              categoryLabel: "Flight",
              price: fl.base_price,
              currency: fl.currency || "BDT",
              route: "/screens/flights",
              params: { flightNumber: fl.flight_number },
            });
          });
        }
      }
    } catch (err) {
      console.warn("unifiedSearchEngine error:", err);
    }

    return results;
  },
};
