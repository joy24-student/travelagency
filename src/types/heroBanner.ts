export interface HeroBanner {
  id: string;
  brand_title: string;
  title: string;
  subtitle: string;
  badge_text: string;
  image_url: string;
  search_placeholder: string;
  search_button_text: string;
  cta_link: string;
  overlay_opacity: number;
  is_active: boolean;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}

export type SearchCategory =
  | "all"
  | "destinations"
  | "hotels"
  | "flights"
  | "tours"
  | "trains"
  | "packages"
  | "activities";

export interface TrendingSearchItem {
  id: string;
  query_text: string;
  category: SearchCategory | "general";
  badge_tag?: string;
  icon_name: string;
  search_count: number;
  target_route: string;
  target_params?: Record<string, any>;
  is_active: boolean;
  is_featured: boolean;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface UnifiedSearchResult {
  id: string;
  title: string;
  subtitle: string;
  category: "destinations" | "hotels" | "flights" | "tours" | "trains" | "packages";
  categoryLabel: string;
  imageUrl?: string;
  price?: number | string;
  currency?: string;
  rating?: number | string;
  badge?: string;
  route: string;
  params?: Record<string, any>;
}
