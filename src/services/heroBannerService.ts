import { supabase } from "../utils/supabase";
import { HeroBanner } from "../types/heroBanner";

export const DEFAULT_FALLBACK_BANNER: HeroBanner = {
  id: "default-hero-banner",
  brand_title: "ShopnoJatra",
  title: "Discover Your Next Journey",
  subtitle: "Explore the world with AI-powered travel planning and smart booking.",
  badge_text: "AI TRAVEL PLANNING",
  image_url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&auto=format&fit=crop&q=80",
  search_placeholder: "Where do you want to go?",
  search_button_text: "Search",
  cta_link: "/screens/search",
  overlay_opacity: 0.35,
  is_active: true,
  display_order: 1,
};

export const heroBannerService = {
  /**
   * Fetch active hero banners for the Home Screen
   */
  async getActiveBanners(): Promise<HeroBanner[]> {
    try {
      const { data, error } = await supabase
        .from("home_hero_banners")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("heroBannerService.getActiveBanners error:", error.message);
        return [DEFAULT_FALLBACK_BANNER];
      }

      if (!data || data.length === 0) {
        return [DEFAULT_FALLBACK_BANNER];
      }

      return data as HeroBanner[];
    } catch (err) {
      console.warn("heroBannerService.getActiveBanners exception:", err);
      return [DEFAULT_FALLBACK_BANNER];
    }
  },

  /**
   * Fetch all hero banners for Admin Management
   */
  async getAllBanners(): Promise<HeroBanner[]> {
    try {
      const { data, error } = await supabase
        .from("home_hero_banners")
        .select("*")
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as HeroBanner[];
    } catch (err) {
      console.error("heroBannerService.getAllBanners error:", err);
      return [DEFAULT_FALLBACK_BANNER];
    }
  },

  /**
   * Create new hero banner (Admin)
   */
  async createBanner(banner: Omit<HeroBanner, "id" | "created_at" | "updated_at">): Promise<HeroBanner> {
    const { data, error } = await supabase
      .from("home_hero_banners")
      .insert([
        {
          ...banner,
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data as HeroBanner;
  },

  /**
   * Update hero banner (Admin)
   */
  async updateBanner(id: string, updates: Partial<HeroBanner>): Promise<HeroBanner> {
    const { data, error } = await supabase
      .from("home_hero_banners")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as HeroBanner;
  },

  /**
   * Set primary slide banner (makes it first in slideshow order)
   */
  async setPrimaryActiveBanner(id: string): Promise<void> {
    const { error } = await supabase
      .from("home_hero_banners")
      .update({ is_active: true, display_order: 1 })
      .eq("id", id);

    if (error) throw error;
  },

  /**
   * Toggle banner active status (Admin)
   */
  async toggleActive(id: string, currentStatus: boolean): Promise<HeroBanner> {
    return this.updateBanner(id, { is_active: !currentStatus });
  },

  /**
   * Delete banner (Admin)
   */
  async deleteBanner(id: string): Promise<void> {
    const { error } = await supabase
      .from("home_hero_banners")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },
};
