import { supabase } from "../utils/supabase";
import { TrendingSearchItem } from "../types/heroBanner";

export const DEFAULT_FALLBACK_TRENDING: TrendingSearchItem[] = [
  {
    id: "fb-1",
    query_text: "Cox's Bazar Beach Package",
    category: "packages",
    badge_tag: "HOT",
    icon_name: "flame",
    search_count: 2480,
    target_route: "/screens/packages",
    is_active: true,
    is_featured: true,
    display_order: 1,
  },
  {
    id: "fb-2",
    query_text: "Sajek Valley Luxury Resort",
    category: "destinations",
    badge_tag: "TRENDING",
    icon_name: "cloud",
    search_count: 1920,
    target_route: "/screens/search-stays",
    is_active: true,
    is_featured: true,
    display_order: 2,
  },
  {
    id: "fb-3",
    query_text: "Bali Honeymoon Villa",
    category: "hotels",
    badge_tag: "POPULAR",
    icon_name: "bed",
    search_count: 1650,
    target_route: "/screens/hotels-homes",
    is_active: true,
    is_featured: true,
    display_order: 3,
  },
  {
    id: "fb-4",
    query_text: "Sylhet Tea Estate Cottages",
    category: "hotels",
    badge_tag: "30% OFF",
    icon_name: "leaf",
    search_count: 1380,
    target_route: "/screens/search-stays",
    is_active: true,
    is_featured: false,
    display_order: 4,
  },
  {
    id: "fb-5",
    query_text: "Dubai Desert Safari Tour",
    category: "tours",
    badge_tag: "TOP CHOICE",
    icon_name: "compass",
    search_count: 1120,
    target_route: "/screens/recommended-tours",
    is_active: true,
    is_featured: false,
    display_order: 5,
  },
  {
    id: "fb-6",
    query_text: "Dhaka to Chittagong Fast Train",
    category: "trains",
    badge_tag: "FASTEST",
    icon_name: "train",
    search_count: 940,
    target_route: "/screens/trains",
    is_active: true,
    is_featured: false,
    display_order: 6,
  },
];

export const trendingSearchService = {
  /**
   * Fetch active trending searches for user auto-suggestion & home screen
   */
  async getActiveTrending(): Promise<TrendingSearchItem[]> {
    try {
      const { data, error } = await supabase
        .from("trending_searches")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .order("search_count", { ascending: false });

      if (error) {
        console.warn("trendingSearchService.getActiveTrending error:", error.message);
        return DEFAULT_FALLBACK_TRENDING;
      }

      if (!data || data.length === 0) {
        return DEFAULT_FALLBACK_TRENDING;
      }

      return data as TrendingSearchItem[];
    } catch (err) {
      console.warn("trendingSearchService.getActiveTrending exception:", err);
      return DEFAULT_FALLBACK_TRENDING;
    }
  },

  /**
   * Fetch all trending searches for Admin Management
   */
  async getAllTrending(): Promise<TrendingSearchItem[]> {
    try {
      const { data, error } = await supabase
        .from("trending_searches")
        .select("*")
        .order("display_order", { ascending: true })
        .order("search_count", { ascending: false });

      if (error) throw error;
      return (data || []) as TrendingSearchItem[];
    } catch (err) {
      console.error("trendingSearchService.getAllTrending error:", err);
      return DEFAULT_FALLBACK_TRENDING;
    }
  },

  /**
   * Create new trending search item (Admin)
   */
  async createTrendingItem(
    item: Omit<TrendingSearchItem, "id" | "created_at" | "updated_at">
  ): Promise<TrendingSearchItem> {
    const { data, error } = await supabase
      .from("trending_searches")
      .insert([
        {
          ...item,
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data as TrendingSearchItem;
  },

  /**
   * Update trending search item (Admin)
   */
  async updateTrendingItem(
    id: string,
    updates: Partial<TrendingSearchItem>
  ): Promise<TrendingSearchItem> {
    const { data, error } = await supabase
      .from("trending_searches")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as TrendingSearchItem;
  },

  /**
   * Toggle active state (Admin)
   */
  async toggleActive(id: string, currentStatus: boolean): Promise<TrendingSearchItem> {
    return this.updateTrendingItem(id, { is_active: !currentStatus });
  },

  /**
   * Delete trending search item (Admin)
   */
  async deleteTrendingItem(id: string): Promise<void> {
    const { error } = await supabase
      .from("trending_searches")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  /**
   * Log search query to search_logs and increment search_count if matching trending search exists
   */
  async logSearch(query: string, category: string = "general"): Promise<void> {
    if (!query || !query.trim()) return;
    const cleanQuery = query.trim();

    try {
      // 1. Record in search_logs
      await supabase.from("search_logs").insert([
        {
          query: cleanQuery,
          category,
          device_platform: "app",
        },
      ]);

      // 2. Increment count on trending_searches if matched
      const { data: matched } = await supabase
        .from("trending_searches")
        .select("id, search_count")
        .ilike("query_text", cleanQuery)
        .limit(1);

      if (matched && matched.length > 0) {
        await supabase
          .from("trending_searches")
          .update({
            search_count: (matched[0].search_count || 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", matched[0].id);
      }
    } catch {
      // Non-blocking log
    }
  },
};
