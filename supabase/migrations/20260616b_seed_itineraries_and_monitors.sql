-- ============================================================================
-- SEED DATA: 20260616b_seed_itineraries_and_monitors.sql
-- High-Quality Production Itineraries & Sample Monitored Journeys (Bangladesh)
-- ============================================================================

DO $$
DECLARE
  creator_user_id UUID := 'a0000000-0000-0000-0000-000000000001'::uuid;
  creator_user_id2 UUID := 'a0000000-0000-0000-0000-000000000002'::uuid;
  creator_profile_id UUID := 'b0000000-0000-0000-0000-000000000001'::uuid;
  itin1_id UUID := 'c0000000-0000-0000-0000-000000000001'::uuid;
  itin2_id UUID := 'c0000000-0000-0000-0000-000000000002'::uuid;
  itin3_id UUID := 'c0000000-0000-0000-0000-000000000003'::uuid;
  itin1_day1 UUID := 'd0000000-0000-0000-0000-000000000001'::uuid;
  itin1_day2 UUID := 'd0000000-0000-0000-0000-000000000002'::uuid;
  itin1_day3 UUID := 'd0000000-0000-0000-0000-000000000003'::uuid;
  itin1_day4 UUID := 'd0000000-0000-0000-0000-000000000004'::uuid;
  itin1_day5 UUID := 'd0000000-0000-0000-0000-000000000005'::uuid;
  itin1_day6 UUID := 'd0000000-0000-0000-0000-000000000006'::uuid;
  itin1_day7 UUID := 'd0000000-0000-0000-0000-000000000007'::uuid;
BEGIN
  -- 1. Insert seed creators in user_profiles
  INSERT INTO public.user_profiles (id, first_name, last_name, display_name, email, role, avatar_url, bio)
  VALUES 
    (creator_user_id, 'Tariqul', 'Islam', 'Tariqul Islam (TravelBD)', 'tariqul@travelbd.org', 'creator', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200', 'Solo explorer and verified Bangladesh wilderness trekker.'),
    (creator_user_id2, 'Nusrat', 'Jahan', 'Nusrat Travels', 'nusrat@shopnojatra.com', 'creator', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200', 'Luxury resort reviewer and culinary travel creator.')
  ON CONFLICT (id) DO NOTHING;

  -- 2. Insert creator_profiles
  INSERT INTO public.creator_profiles (id, user_id, handle, display_name, bio, avatar_url, verified, badges, total_clones, total_saves, rating)
  VALUES 
    (creator_profile_id, creator_user_id, 'tariq_tours', 'Tariqul Islam (TravelBD)', 'Lead guide with 120+ tours across Coxs Bazar, Saint Martin and the Chittagong Hill Tracts.', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200', TRUE, ARRAY['Verified Guide', 'Super Creator', 'Top Cloned'], 1420, 3890, 4.95)
  ON CONFLICT (user_id) DO UPDATE SET total_clones = 1420;

  -- 3. Master Itinerary 1: "7 Days in Cox's Bazar, Saint Martin & Bandarban"
  INSERT INTO public.itineraries (
    id, creator_id, title, slug, description, cover_image, destination, destination_country,
    start_location, end_location, duration_days, estimated_budget, currency, travel_category,
    difficulty_level, visibility, is_featured, clone_count, save_count, view_count, rating, review_count,
    tags, highlights, included_services, excluded_services
  ) VALUES (
    itin1_id, creator_user_id, '7 Days in Cox''s Bazar, Saint Martin & Bandarban',
    '7-days-coxs-bazar-saint-martin-bandarban',
    'The quintessential grand tour of Southeastern Bangladesh: explore the world''s longest natural sea beach, the turquoise coral reefs of Saint Martin Island, and the mist-laden peaks of Bandarban.',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
    'Cox''s Bazar', 'Bangladesh', 'Dhaka', 'Dhaka', 7, 24500.00, 'BDT', 'adventure', 'moderate', 'public', TRUE, 890, 2410, 15400, 4.92, 128,
    ARRAY['Beach', 'Island', 'Trekking', 'Seafood', 'Hill Tracts'],
    ARRAY['Sunset at Inani Coral Beach', 'Ferry to Saint Martin Island', 'Chimbuk Hill & Nilgiri Cloud Station', 'Traditional Rakhine Seafood Feast'],
    ARRAY['AC Transport', 'Boutique Hotel Reservations', 'Island Ferry Pass', 'Licensed Local Guide'],
    ARRAY['Personal Souvenirs', 'Water Sports Equipment Rental']
  ) ON CONFLICT (id) DO UPDATE SET clone_count = 890;

  -- Day 1
  INSERT INTO public.itinerary_days (id, itinerary_id, day_number, title, subtitle, day_start_time, cover_image, stops_count)
  VALUES (itin1_day1, itin1_id, 1, 'Day 1: Arrival & Sunset Beach', 'Dhaka to Cox''s Bazar & Beachside Check-in', '08:00 AM', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400', 4)
  ON CONFLICT (itinerary_id, day_number) DO NOTHING;

  -- Items for Day 1
  INSERT INTO public.itinerary_items (itinerary_day_id, title, subtitle, category, start_time, end_time, duration_minutes, transit_instruction, location_name, estimated_cost, currency, order_index, booking_required, provider_type)
  VALUES 
    (itin1_day1, 'Dhaka to Cox''s Bazar Journey', 'Flight BG-433 or AC Scania Coach', 'transport', '08:00 AM', '12:30 PM', 270, 'Depart Hazrat Shahjalal International Airport (T1)', 'Hazrat Shahjalal International Airport', 4200.00, 'BDT', 0, TRUE, 'flight'),
    (itin1_day1, 'Check-in @ Sayeman Beach Resort', 'Marine Drive, Kolatoli Point', 'hotel', '01:30 PM', '02:30 PM', 60, '15-min taxi from airport along Marine Drive', 'Sayeman Beach Resort', 6500.00, 'BDT', 1, TRUE, 'hotel'),
    (itin1_day1, 'Lunch @ Jhaubon Restaurant', 'Famous authentic Cox''s Bazar Rupchanda & Koral fish curry', 'restaurant', '02:45 PM', '04:00 PM', 75, 'Walk 350m along Kolatoli beach road', 'Jhaubon Seafood', 650.00, 'BDT', 2, FALSE, 'restaurant'),
    (itin1_day1, 'Sunset Walk & Beach Photography', 'Sugondha Beach and Kolatoli Beach', 'activity', '04:30 PM', '06:30 PM', 120, 'Stroll south along golden sands', 'Sugondha Beach', 0.00, 'BDT', 3, FALSE, 'activity')
  ON CONFLICT DO NOTHING;

  -- Day 2
  INSERT INTO public.itinerary_days (id, itinerary_id, day_number, title, subtitle, day_start_time, cover_image, stops_count)
  VALUES (itin1_day2, itin1_id, 2, 'Day 2: Marine Drive & Inani Coral Beach', 'Himchari National Park and Inani Beach exploration', '09:00 AM', 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400', 3)
  ON CONFLICT (itinerary_id, day_number) DO NOTHING;

  INSERT INTO public.itinerary_items (itinerary_day_id, title, subtitle, category, start_time, end_time, duration_minutes, transit_instruction, location_name, estimated_cost, currency, order_index, booking_required, provider_type)
  VALUES 
    (itin1_day2, 'Open Chander Gari Ride to Himchari', 'Scenic coastal drive on the world''s longest Marine Drive', 'transport', '09:00 AM', '10:00 AM', 60, 'Take 4x4 open jeep / Chander Gari (18km)', 'Marine Drive Himchari', 1200.00, 'BDT', 0, TRUE, 'transfer'),
    (itin1_day2, 'Himchari Waterfall & Hilltop Lookout', 'Panaromic 360-degree Bay of Bengal view', 'attraction', '10:15 AM', '12:30 PM', 135, 'Climb 200 paved steps to the cliff summit', 'Himchari National Park', 100.00, 'BDT', 1, FALSE, 'attraction'),
    (itin1_day2, 'Inani Coral Stone Beach & Coconut Tasting', 'Explore ancient dead coral boulders and serene tides', 'activity', '02:00 PM', '05:30 PM', 210, 'Drive 14km south to Inani Beach', 'Inani Beach', 350.00, 'BDT', 2, FALSE, 'activity')
  ON CONFLICT DO NOTHING;

  -- Day 3
  INSERT INTO public.itinerary_days (id, itinerary_id, day_number, title, subtitle, day_start_time, cover_image, stops_count)
  VALUES (itin1_day3, itin1_id, 3, 'Day 3: Cruise to Saint Martin Island', 'Teknaf Jetty to the Coral Island & Eco-Resort', '07:00 AM', 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=400', 3)
  ON CONFLICT (itinerary_id, day_number) DO NOTHING;

  INSERT INTO public.itinerary_items (itinerary_day_id, title, subtitle, category, start_time, end_time, duration_minutes, transit_instruction, location_name, estimated_cost, currency, order_index, booking_required, provider_type)
  VALUES 
    (itin1_day3, 'Transfer to Teknaf Marine Jetty', 'Coach transit through the hills to Teknaf port', 'transport', '06:30 AM', '09:00 AM', 150, 'AC Minivan from Cox''s Bazar to Teknaf (80km)', 'Teknaf Ferry Terminal', 800.00, 'BDT', 0, TRUE, 'transfer'),
    (itin1_day3, 'Keari Sindbad Cruise across Naf River', 'Luxury sea vessel cruise with seagulls escorting the ship', 'boat', '09:30 AM', '12:00 PM', 150, 'Board ship with verified seaport boarding pass', 'Bay of Bengal Cruise', 1800.00, 'BDT', 1, TRUE, 'boat'),
    (itin1_day3, 'Eco-Resort Check-in & Island Fresh Green Coconut', 'Blue Marine Resort or Fantasy Island', 'hotel', '01:00 PM', '02:30 PM', 90, 'Van/Rickshaw to West Beach', 'Blue Marine Eco Resort', 3500.00, 'BDT', 2, TRUE, 'hotel')
  ON CONFLICT DO NOTHING;

  -- Master Itinerary 2: "4 Days in Sylhet & Sreemangal"
  INSERT INTO public.itineraries (
    id, creator_id, title, slug, description, cover_image, destination, destination_country,
    start_location, end_location, duration_days, estimated_budget, currency, travel_category,
    difficulty_level, visibility, is_featured, clone_count, save_count, view_count, rating, review_count,
    tags, highlights, included_services, excluded_services
  ) VALUES (
    itin2_id, creator_user_id2, '4 Days in Sylhet, Sreemangal & Ratargul Swamp',
    '4-days-sylhet-sreemangal-ratargul',
    'Immerse in lush green 7-layer tea gardens, cruise through the only freshwater swamp forest in Bangladesh, and swim in the crystal-clear Lalakhal river.',
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800',
    'Sylhet', 'Bangladesh', 'Dhaka', 'Dhaka', 4, 13500.00, 'BDT', 'nature', 'easy', 'public', TRUE, 640, 1850, 9800, 4.88, 92,
    ARRAY['Tea Gardens', 'Swamp Forest', 'River Cruise', 'Rainforest', 'Eco-tourism'],
    ARRAY['Silent canoe ride in Ratargul Swamp', '7-Color Tea at Nilkantha Cabin', 'Trek Lawachara National Park', 'Lalakhal emerald water boat ride'],
    ARRAY['Train/Car Transport', 'Tea Resort Stays', 'Boat Permits', 'Local Expert'],
    ARRAY['Personal Shopping', 'Tips']
  ) ON CONFLICT (id) DO UPDATE SET clone_count = 640;

  -- Master Itinerary 3: "3 Days in Sajek Valley - Cloud Haven"
  INSERT INTO public.itineraries (
    id, creator_id, title, slug, description, cover_image, destination, destination_country,
    start_location, end_location, duration_days, estimated_budget, currency, travel_category,
    difficulty_level, visibility, is_featured, clone_count, save_count, view_count, rating, review_count,
    tags, highlights, included_services, excluded_services
  ) VALUES (
    itin3_id, creator_user_id, '3 Days in Sajek Valley - Kingdom of Clouds',
    '3-days-sajek-valley-cloud-haven',
    'Travel above the clouds to the hill kingdom of Sajek. Experience sunrise from Konglak Para, indigenous bamboo chicken delicacy, and starry night skies.',
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800',
    'Sajek Valley', 'Bangladesh', 'Dhaka', 'Dhaka', 3, 9800.00, 'BDT', 'weekend', 'easy', 'public', TRUE, 1120, 3100, 21000, 4.96, 215,
    ARRAY['Clouds', 'Mountains', 'Indigenous Culture', 'Photography', 'Weekend'],
    ARRAY['Sunset from Helipad 2', 'Trek to highest peak Konglak Para', 'Traditional Bamboo Biryani dinner', 'Military escort convoy through lush mountains'],
    ARRAY['Chander Gari 4x4', 'Hilltop Cottage Stay', 'Army Escort Clearance', 'Breakfast'],
    ARRAY['Souvenirs', 'Personal Porter']
  ) ON CONFLICT (id) DO UPDATE SET clone_count = 1120;

END $$;
