-- ============================================================================
-- SEED COMMUNITY PROFILES, POSTS, MEDIA & ADVERTISEMENTS
-- Using valid UUID hex characters
-- ============================================================================

-- 1. SEED COMMUNITY PROFILES
INSERT INTO community_profiles (
  id, display_name, username, avatar_url, bio, location, is_influencer, followers_count, following_count, posts_count, metadata
)
VALUES
  (
    '5e491c34-50b4-4d2a-8cac-d09fddd7745c',
    'Elvis Mittra',
    'Elvis.mittra',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
    'Travel Photographer & Explorer across Asia. Sharing hidden gems.',
    'Bogra, Bangladesh',
    true, 14200, 320, 84,
    '{"badge": "Top Creator", "verified": true}'::jsonb
  ),
  (
    '0ce5b7b9-7d51-4942-91c0-4b9b8d0132c9',
    'Rahat Galiv',
    'RahatGaliv',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
    'Sylhet Nature Guide & Eco-Tourism Adventurer.',
    'Sylhet, Bangladesh',
    true, 8900, 150, 42,
    '{"badge": "Local Guide", "verified": true}'::jsonb
  ),
  (
    'fe097f5f-44ea-4e66-a738-1208b6991d74',
    'Tania Travels',
    'Tania.travels',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200',
    'Solo Backpacker exploring beaches, islands, and street food.',
    'Cox''s Bazar, Bangladesh',
    true, 23500, 410, 115,
    '{"badge": "Influencer", "verified": true}'::jsonb
  ),
  (
    '4ba914d5-181f-44e8-a47c-8b1e57045791',
    'Siam Wanderer',
    'Siam.wanderer',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200',
    'Urban architecture and historic heritage photography.',
    'Dhaka, Bangladesh',
    false, 5400, 210, 31,
    '{"badge": "Heritage Scout"}'::jsonb
  )
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  username = EXCLUDED.username,
  avatar_url = EXCLUDED.avatar_url;

-- 2. SEED POSTS
INSERT INTO posts (
  id, user_id, title, content, location, visibility, status, likes_count, comments_count, metadata, created_at
)
VALUES
  (
    'a1111111-1111-1111-1111-111111111111',
    '5e491c34-50b4-4d2a-8cac-d09fddd7745c',
    'Momo Inn: Bogura''s Must-Visit Hangout Spot...',
    'Found this incredible eco resort nestled in Bogura! The garden dining and outdoor infinity pool with morning mist are absolutely magical.',
    'Bogra, Bangladesh',
    'public', 'published',
    761, 48,
    '{"views_count": 1420, "rating": 4.9, "tags": ["resort", "nature", "bogura"]}'::jsonb,
    NOW() - INTERVAL '2 hours'
  ),
  (
    'a2222222-2222-2222-2222-222222222222',
    '0ce5b7b9-7d51-4942-91c0-4b9b8d0132c9',
    '🌿 🛶 Ratargul Swamp Forest — Bangladesh''s Amazon',
    'Gliding silently through the freshwater swamp forest on a wooden canoe. The submerged trees and bird calls create an ethereal atmosphere you will never forget.',
    'Sylhet, Bangladesh',
    'public', 'published',
    432, 29,
    '{"views_count": 980, "rating": 4.95, "tags": ["rainforest", "adventure", "sylhet"]}'::jsonb,
    NOW() - INTERVAL '5 hours'
  ),
  (
    'a3333333-3333-3333-3333-333333333333',
    'fe097f5f-44ea-4e66-a738-1208b6991d74',
    'Saint Martin''s Coral Island: Crystal Turquoise Waters',
    'Woke up right in front of the ocean. Coconut trees swaying and fresh grilled red snapper at night under a blanket of stars.',
    'Cox''s Bazar, Bangladesh',
    'public', 'published',
    895, 63,
    '{"views_count": 2310, "rating": 4.88, "tags": ["beach", "island", "seafood"]}'::jsonb,
    NOW() - INTERVAL '1 day'
  ),
  (
    'a4444444-4444-4444-4444-444444444444',
    '4ba914d5-181f-44e8-a47c-8b1e57045791',
    'Historic Lalbagh Fort at Golden Hour',
    'The 17th-century Mughal fortress in Old Dhaka glows in deep terracotta red as the sun sets over the Buriganga river gardens.',
    'Dhaka, Bangladesh',
    'public', 'published',
    620, 34,
    '{"views_count": 1100, "rating": 4.75, "tags": ["heritage", "dhaka", "history"]}'::jsonb,
    NOW() - INTERVAL '2 days'
  ),
  (
    'a5555555-5555-5555-5555-555555555555',
    '5e491c34-50b4-4d2a-8cac-d09fddd7745c',
    'Peaceful Morning in Arashiyama Bamboo Grove',
    'Waking up before sunrise to catch the morning rays piercing through the towering green bamboo stalks in Kyoto.',
    'Kyoto, Japan',
    'public', 'published',
    1150, 88,
    '{"views_count": 3400, "rating": 4.95, "tags": ["japan", "kyoto", "bamboo"]}'::jsonb,
    NOW() - INTERVAL '3 days'
  ),
  (
    'a6666666-6666-6666-6666-666666666666',
    'fe097f5f-44ea-4e66-a738-1208b6991d74',
    'The Bund & Neon Skyscrapers of Shanghai',
    'Standing on the historic Bund promenade watching the Oriental Pearl Tower and Shanghai Tower light up the Huangpu river.',
    'Shanghai, China',
    'public', 'published',
    1480, 112,
    '{"views_count": 4200, "rating": 4.92, "tags": ["shanghai", "skyline", "city"]}'::jsonb,
    NOW() - INTERVAL '4 days'
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  likes_count = EXCLUDED.likes_count,
  metadata = EXCLUDED.metadata;

-- 3. SEED POST MEDIA
INSERT INTO post_media (id, post_id, media_url, media_type, sort_order)
VALUES
  ('b1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=800', 'image', 0),
  ('b2222222-2222-2222-2222-222222222222', 'a2222222-2222-2222-2222-222222222222', 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800', 'image', 0),
  ('b3333333-3333-3333-3333-333333333333', 'a3333333-3333-3333-3333-333333333333', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800', 'image', 0),
  ('b4444444-4444-4444-4444-444444444444', 'a4444444-4444-4444-4444-444444444444', 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800', 'image', 0),
  ('b5555555-5555-5555-5555-555555555555', 'a5555555-5555-5555-5555-555555555555', 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=800', 'image', 0),
  ('b6666666-6666-6666-6666-666666666666', 'a6666666-6666-6666-6666-666666666666', 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800', 'image', 0)
ON CONFLICT (id) DO UPDATE SET media_url = EXCLUDED.media_url;

-- 4. SEED ADVERTISEMENTS (ADMIN PANEL BANNERS)
INSERT INTO advertisements (
  id, title, banner_url, target_url, placement, status, click_count, created_at
)
VALUES
  (
    '0a111111-1111-1111-1111-111111111111',
    'Explore Asia — Travel Deals Up to 50% Off',
    'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800',
    '/screens/search-stays',
    'home_banner',
    'active',
    1240,
    NOW()
  ),
  (
    '0a222222-2222-2222-2222-222222222222',
    'Trip.Tuesday — $99 Flights to Canada & Asia ($40 Coupon Drop)',
    'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800',
    '/screens/flights',
    'home_banner',
    'active',
    890,
    NOW()
  ),
  (
    '0a333333-3333-3333-3333-333333333333',
    'Summer Villa Escapes & Private Stays',
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
    '/screens/hotels-homes',
    'home_banner',
    'active',
    650,
    NOW()
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  banner_url = EXCLUDED.banner_url,
  status = EXCLUDED.status;

