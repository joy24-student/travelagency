-- ============================================================================
-- SEED STORIES, GROUPS, GROUP MESSAGES & POST COMMENTS
-- ============================================================================

-- 1. SEED STORIES
INSERT INTO stories (
  id, user_id, media_url, media_type, caption, location, expires_at, created_at
)
VALUES
  (
    'c1111111-1111-1111-1111-111111111111',
    '5e491c34-50b4-4d2a-8cac-d09fddd7745c',
    'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=600',
    'image',
    'Morning mist over Arashiyama bamboo forest 🎋',
    'Kyoto, Japan',
    NOW() + INTERVAL '7 days',
    NOW() - INTERVAL '3 hours'
  ),
  (
    'c2222222-2222-2222-2222-222222222222',
    '0ce5b7b9-7d51-4942-91c0-4b9b8d0132c9',
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600',
    'image',
    'Fresh mountain breeze & endless green tea slopes 🍃',
    'Sylhet, Bangladesh',
    NOW() + INTERVAL '7 days',
    NOW() - INTERVAL '6 hours'
  ),
  (
    'c3333333-3333-3333-3333-333333333333',
    'fe097f5f-44ea-4e66-a738-1208b6991d74',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600',
    'image',
    'Crystal clear ocean tides at sunset 🌊🏝️',
    'Saint Martin, Bangladesh',
    NOW() + INTERVAL '7 days',
    NOW() - INTERVAL '10 hours'
  ),
  (
    'c4444444-4444-4444-4444-444444444444',
    '4ba914d5-181f-44e8-a47c-8b1e57045791',
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600',
    'image',
    'Golden hour lights highlighting the terracotta fort walls ✨',
    'Dhaka, Bangladesh',
    NOW() + INTERVAL '7 days',
    NOW() - INTERVAL '14 hours'
  )
ON CONFLICT (id) DO UPDATE SET
  media_url = EXCLUDED.media_url,
  caption = EXCLUDED.caption,
  expires_at = EXCLUDED.expires_at;

-- 2. SEED TRAVEL GROUPS
INSERT INTO groups (
  id, owner_id, name, description, avatar_url, destination, privacy, members_count, created_at
)
VALUES
  (
    'd1111111-1111-1111-1111-111111111111',
    '5e491c34-50b4-4d2a-8cac-d09fddd7745c',
    'Backpackers Asia & BD',
    'Budget travel tips, bus/train routes, and hidden gems across Asia.',
    'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400',
    'South & East Asia',
    'public',
    1420,
    NOW() - INTERVAL '10 days'
  ),
  (
    'd2222222-2222-2222-2222-222222222222',
    'fe097f5f-44ea-4e66-a738-1208b6991d74',
    'Resort & Luxury Escapes',
    'Boutique villas, infinity pools, and exclusive stay deals.',
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400',
    'Global Stays',
    'public',
    850,
    NOW() - INTERVAL '15 days'
  ),
  (
    'd3333333-3333-3333-3333-333333333333',
    '0ce5b7b9-7d51-4942-91c0-4b9b8d0132c9',
    'Eco Trails & Forest Treks',
    'Swamp forests, waterfalls, canoeing, and camping adventurers.',
    'https://images.unsplash.com/photo-1511497584788-87676104235f?w=400',
    'Sylhet & Chittagong',
    'public',
    620,
    NOW() - INTERVAL '20 days'
  ),
  (
    'd4444444-4444-4444-4444-444444444444',
    '4ba914d5-181f-44e8-a47c-8b1e57045791',
    'Solo Explorers Club',
    'Safe solo travel itineraries, meetup cafes, and hotel reviews.',
    'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400',
    'Southeast Asia',
    'public',
    1100,
    NOW() - INTERVAL '25 days'
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  members_count = EXCLUDED.members_count;

-- 3. SEED GROUP MESSAGES
INSERT INTO group_messages (
  id, group_id, user_id, content, created_at
)
VALUES
  (
    'e1111111-1111-1111-1111-111111111111',
    'd1111111-1111-1111-1111-111111111111',
    '5e491c34-50b4-4d2a-8cac-d09fddd7745c',
    'Welcome everyone! Feel free to share your current destination or upcoming travel dates.',
    NOW() - INTERVAL '2 hours'
  ),
  (
    'e2222222-2222-2222-2222-222222222222',
    'd1111111-1111-1111-1111-111111111111',
    '0ce5b7b9-7d51-4942-91c0-4b9b8d0132c9',
    'Hey guys! Ratargul water levels are ideal for boating right now, clear weather this week.',
    NOW() - INTERVAL '1 hour'
  ),
  (
    'e3333333-3333-3333-3333-333333333333',
    'd1111111-1111-1111-1111-111111111111',
    'fe097f5f-44ea-4e66-a738-1208b6991d74',
    'Just got to Saint Martin, the night sky is completely starry tonight!',
    NOW() - INTERVAL '25 minutes'
  )
ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content;

-- 4. SEED POST COMMENTS
INSERT INTO post_comments (
  id, post_id, user_id, content, likes_count, created_at
)
VALUES
  (
    'f1111111-1111-1111-1111-111111111111',
    'a1111111-1111-1111-1111-111111111111',
    'fe097f5f-44ea-4e66-a738-1208b6991d74',
    'The infinity pool looks incredible! Did you have breakfast in the garden terrace?',
    14,
    NOW() - INTERVAL '1 hour'
  ),
  (
    'f2222222-2222-2222-2222-222222222222',
    'a1111111-1111-1111-1111-111111111111',
    '0ce5b7b9-7d51-4942-91c0-4b9b8d0132c9',
    'Stayed there last winter, one of the best eco retreats in North Bengal!',
    8,
    NOW() - INTERVAL '45 minutes'
  ),
  (
    'f3333333-3333-3333-3333-333333333333',
    'a2222222-2222-2222-2222-222222222222',
    '5e491c34-50b4-4d2a-8cac-d09fddd7745c',
    'Pure serene vibes! What time of day did you hire the wooden canoe?',
    19,
    NOW() - INTERVAL '2 hours'
  ),
  (
    'f4444444-4444-4444-4444-444444444444',
    'a3333333-3333-3333-3333-333333333333',
    '4ba914d5-181f-44e8-a47c-8b1e57045791',
    'Saint Martin in November/December is absolute paradise. Great capture Tania!',
    12,
    NOW() - INTERVAL '5 hours'
  )
ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content;

