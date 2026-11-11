-- ============================================================================
-- 20260617_home_hero_banner_and_trending_searches.sql
-- Dynamic Hero Banners, Trending Searches & Omnibar Search Engine Schema
-- Full admin control for Banner Images, Text, Search Engine Suggestions
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. HOME HERO BANNERS TABLE
CREATE TABLE IF NOT EXISTS home_hero_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_title TEXT NOT NULL DEFAULT 'ShopnoJatra',
  title TEXT NOT NULL DEFAULT 'Discover Your Next Journey',
  subtitle TEXT NOT NULL DEFAULT 'Explore the world with AI-powered travel planning and smart booking.',
  badge_text TEXT DEFAULT 'AI TRAVEL PLANNING',
  image_url TEXT NOT NULL DEFAULT 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&auto=format&fit=crop&q=80',
  search_placeholder TEXT NOT NULL DEFAULT 'Where do you want to go?',
  search_button_text TEXT NOT NULL DEFAULT 'Search',
  cta_link TEXT DEFAULT '/screens/search',
  overlay_opacity NUMERIC(3, 2) NOT NULL DEFAULT 0.35,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. TRENDING SEARCHES TABLE
CREATE TABLE IF NOT EXISTS trending_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_text TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  badge_tag TEXT DEFAULT 'TRENDING',
  icon_name TEXT NOT NULL DEFAULT 'flame',
  search_count INTEGER NOT NULL DEFAULT 1200,
  target_route TEXT NOT NULL DEFAULT '/screens/search',
  target_params JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. SEARCH LOGS TABLE (For tracking real-time user searches dynamically)
CREATE TABLE IF NOT EXISTS search_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL,
  category TEXT,
  results_count INTEGER DEFAULT 0,
  device_platform TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_home_hero_banners_active ON home_hero_banners(is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_trending_searches_active ON trending_searches(is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_search_logs_created_at ON search_logs(created_at DESC);

-- Enable RLS
ALTER TABLE home_hero_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE trending_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_logs ENABLE ROW LEVEL SECURITY;

-- Permissive policies for read/write so both user client and admin panel work smoothly
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'home_hero_banners' AND policyname = 'allow_all_home_hero_banners'
  ) THEN
    CREATE POLICY allow_all_home_hero_banners ON home_hero_banners FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'trending_searches' AND policyname = 'allow_all_trending_searches'
  ) THEN
    CREATE POLICY allow_all_trending_searches ON trending_searches FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'search_logs' AND policyname = 'allow_all_search_logs'
  ) THEN
    CREATE POLICY allow_all_search_logs ON search_logs FOR ALL USING (true) WITH CHECK (true);
  END IF;
END
$$;

-- SEED INITIAL HERO BANNERS (Matching user's reference image and travel agency themes)
INSERT INTO home_hero_banners (
  id, brand_title, title, subtitle, badge_text, image_url, search_placeholder, search_button_text, is_active, display_order
) VALUES 
(
  'b1111111-1111-1111-1111-111111111111',
  'ShopnoJatra',
  'Discover Your Next Journey',
  'Explore the world with AI-powered travel planning and smart booking.',
  'AI TRAVEL PLANNING',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&auto=format&fit=crop&q=80',
  'Where do you want to go?',
  'Search',
  true,
  1
),
(
  'b2222222-2222-2222-2222-222222222222',
  'ShopnoJatra',
  'Sajek Valley Cloud Kingdom',
  'Wake up above the clouds with handcrafted luxury resort retreats.',
  'MOUNTAIN ESCAPES',
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1600&auto=format&fit=crop&q=80',
  'Search cottages, resorts, tours...',
  'Explore',
  true,
  2
),
(
  'b3333333-3333-3333-3333-333333333333',
  'ShopnoJatra',
  'Cox''s Bazar Golden Shores',
  'Exclusive 5-star beachfront resorts with private sunset dining.',
  'BEACH & SUNSET',
  'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1600&auto=format&fit=crop&q=80',
  'Find hotels, flights, packages...',
  'Search',
  false,
  3
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  subtitle = EXCLUDED.subtitle,
  image_url = EXCLUDED.image_url,
  badge_text = EXCLUDED.badge_text;

-- SEED INITIAL TRENDING SEARCHES
INSERT INTO trending_searches (
  id, query_text, category, badge_tag, icon_name, search_count, is_active, display_order
) VALUES
(
  'c1111111-1111-1111-1111-111111111111',
  'Cox''s Bazar Beach Package',
  'packages',
  'HOT',
  'flame',
  2480,
  true,
  1
),
(
  'c2222222-2222-2222-2222-222222222222',
  'Sajek Valley Luxury Resort',
  'destinations',
  'TRENDING',
  'cloud',
  1920,
  true,
  2
),
(
  'c3333333-3333-3333-3333-333333333333',
  'Bali Honeymoon Villa',
  'hotels',
  'POPULAR',
  'bed',
  1650,
  true,
  3
),
(
  'c4444444-4444-4444-4444-444444444444',
  'Sylhet Tea Estate Cottages',
  'hotels',
  '30% OFF',
  'leaf',
  1380,
  true,
  4
),
(
  'c5555555-5555-5555-5555-555555555555',
  'Dubai Desert Safari Tour',
  'tours',
  'TOP CHOICE',
  'compass',
  1120,
  true,
  5
),
(
  'c6666666-6666-6666-6666-666666666666',
  'Dhaka to Chittagong Fast Train',
  'trains',
  'FASTEST',
  'train',
  940,
  true,
  6
),
(
  'c7777777-7777-7777-7777-777777777777',
  'Bangkok City & Temple Tour',
  'tours',
  'NEW',
  'airplane',
  830,
  true,
  7
)
ON CONFLICT (id) DO UPDATE SET
  query_text = EXCLUDED.query_text,
  badge_tag = EXCLUDED.badge_tag,
  category = EXCLUDED.category;
