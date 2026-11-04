-- ============================================================================
-- SEED DATA FOR TRAVEL PLATFORM (HOTELS, FLIGHTS, TRAINS, CARS, TOURS, PROMOS)
-- ============================================================================

-- 1. SEED PROMO CODES / VOUCHERS
INSERT INTO promo_codes (code, title, description, discount_type, discount_amount, min_spend, applicable_category, is_active)
VALUES
  ('TRIP15', '$15 Off First Hotel Stay', 'Exclusive welcome voucher for new members', 'fixed', 15.00, 50.00, 'hotel', true),
  ('FLYASIA', '$30 Off Asian Flights', 'Special discount on China Eastern and Asian routes', 'fixed', 30.00, 150.00, 'flight', true),
  ('SUMMER20', '20% Summer Vacation Stays', 'Applicable on beach resorts and private villas', 'percentage', 20.00, 100.00, 'hotel', true),
  ('TRAIN10', '10% Off Bullet Train Passes', 'Discount for high speed rail in Japan and China', 'percentage', 10.00, 40.00, 'train', true),
  ('DRIVEZERO', '$20 Off Car Rentals', 'Save on SUV and Electric vehicle rentals', 'fixed', 20.00, 80.00, 'car', true)
ON CONFLICT (code) DO NOTHING;

-- 2. SEED AIRLINES & AIRPORTS
INSERT INTO airlines (iata_code, name, logo_url)
VALUES
  ('MU', 'China Eastern Airlines', 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=200'),
  ('BG', 'Biman Bangladesh Airlines', 'https://images.unsplash.com/photo-1542296332-2e4473faf563?w=200'),
  ('SQ', 'Singapore Airlines', 'https://images.unsplash.com/photo-1520437358207-323b43b50729?w=200'),
  ('EK', 'Emirates', 'https://images.unsplash.com/photo-1517479149777-5f3b1511d5ad?w=200')
ON CONFLICT (iata_code) DO NOTHING;

INSERT INTO airports (iata_code, icao_code, name, city, country, country_code)
VALUES
  ('DAC', 'VGHS', 'Hazrat Shahjalal International Airport', 'Dhaka', 'Bangladesh', 'BD'),
  ('CXB', 'VGCB', 'Cox''s Bazar Airport', 'Cox''s Bazar', 'Bangladesh', 'BD'),
  ('PVG', 'ZSPD', 'Shanghai Pudong International Airport', 'Shanghai', 'China', 'CN'),
  ('PEK', 'ZBAA', 'Beijing Capital International Airport', 'Beijing', 'China', 'CN'),
  ('HND', 'RJTT', 'Tokyo Haneda Airport', 'Tokyo', 'Japan', 'JP'),
  ('SIN', 'WSSS', 'Singapore Changi Airport', 'Singapore', 'Singapore', 'SG'),
  ('DXB', 'OMDB', 'Dubai International Airport', 'Dubai', 'United Arab Emirates', 'AE')
ON CONFLICT (iata_code) DO NOTHING;

-- 3. SEED FLIGHTS
INSERT INTO flights (
  flight_number, airline_id, departure_airport_id, arrival_airport_id, 
  departure_time, arrival_time, flight_duration, cabin_class, base_price, currency, available_seats
)
SELECT 
  'MU-588', a.id, dep.id, arr.id,
  NOW() + INTERVAL '1 day 4 hours', NOW() + INTERVAL '1 day 9 hours', 300, 'Economy', 285.00, 'USD', 42
FROM airlines a, airports dep, airports arr
WHERE a.iata_code = 'MU' AND dep.iata_code = 'PVG' AND arr.iata_code = 'PEK'
ON CONFLICT DO NOTHING;

INSERT INTO flights (
  flight_number, airline_id, departure_airport_id, arrival_airport_id, 
  departure_time, arrival_time, flight_duration, cabin_class, base_price, currency, available_seats
)
SELECT 
  'BG-021', a.id, dep.id, arr.id,
  NOW() + INTERVAL '2 days 2 hours', NOW() + INTERVAL '2 days 3 hours', 60, 'Economy', 65.00, 'USD', 28
FROM airlines a, airports dep, airports arr
WHERE a.iata_code = 'BG' AND dep.iata_code = 'DAC' AND arr.iata_code = 'CXB'
ON CONFLICT DO NOTHING;

INSERT INTO flights (
  flight_number, airline_id, departure_airport_id, arrival_airport_id, 
  departure_time, arrival_time, flight_duration, cabin_class, base_price, currency, available_seats
)
SELECT 
  'SQ-446', a.id, dep.id, arr.id,
  NOW() + INTERVAL '3 days 6 hours', NOW() + INTERVAL '3 days 10 hours', 240, 'Economy', 340.00, 'USD', 18
FROM airlines a, airports dep, airports arr
WHERE a.iata_code = 'SQ' AND dep.iata_code = 'SIN' AND arr.iata_code = 'HND'
ON CONFLICT DO NOTHING;

-- 4. SEED HOTELS
INSERT INTO hotels (
  name, slug, description, star_rating, average_rating, total_reviews, 
  image_url, address, city, country, country_code, base_price, is_featured
)
VALUES
  (
    'Sea Pearl Beach Resort & Spa',
    'sea-pearl-beach-resort-spa',
    'Luxury 5-star beachfront escape offering private balconies overlooking the Bay of Bengal.',
    5.0, 4.90, 1420,
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
    'Jaliapalong, Inani Beach', 'Cox''s Bazar', 'Bangladesh', 'BD', 120.00, true
  ),
  (
    'Momo Inn Boutique Eco Retreat',
    'momo-inn-boutique-eco-retreat',
    '5-Star eco boutique hotel with sprawling gardens, rooftop pool, and fine dining.',
    5.0, 4.85, 890,
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
    'Nawdapara, Rangpur Road', 'Bogra', 'Bangladesh', 'BD', 75.00, true
  ),
  (
    'Pan Pacific Sonargaon Dhaka',
    'pan-pacific-sonargaon-dhaka',
    'Iconic international luxury hotel in the heart of Dhaka with world-class amenities.',
    5.0, 4.80, 2150,
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800',
    '107 Kazi Nazrul Islam Avenue', 'Dhaka', 'Bangladesh', 'BD', 145.00, true
  ),
  (
    'Grand Sultan Tea Resort & Golf',
    'grand-sultan-tea-resort',
    'Spectacular 5-star resort nestled amid verdant rainforest hills and lush tea estates.',
    5.0, 4.92, 1180,
    'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800',
    'Radhanagar', 'Sreemangal', 'Bangladesh', 'BD', 135.00, true
  ),
  (
    'Kyoto Traditional Ryokan & Onsen Garden',
    'kyoto-traditional-ryokan',
    'Authentic Japanese hot spring inn surrounded by serene Zen gardens and bamboo groves.',
    4.5, 4.95, 780,
    'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=800',
    'Gion District', 'Kyoto', 'Japan', 'JP', 195.00, true
  ),
  (
    'The Ritz-Carlton Shanghai Pudong',
    'ritz-carlton-shanghai',
    'Glamorous skyscraper hotel with sweeping views of the Huangpu River and the Bund.',
    5.0, 4.90, 3100,
    'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800',
    'Lujiazui, Pudong', 'Shanghai', 'China', 'CN', 230.00, true
  )
ON CONFLICT (slug) DO NOTHING;

-- 5. SEED TRAIN STATIONS & TRAINS
INSERT INTO train_stations (station_code, name, city, country)
VALUES
  ('TYO', 'Tokyo Central Station', 'Tokyo', 'Japan'),
  ('KYO', 'Kyoto Station', 'Kyoto', 'Japan'),
  ('SHA', 'Shanghai Hongqiao Railway Station', 'Shanghai', 'China'),
  ('BEI', 'Beijing South Railway Station', 'Beijing', 'China'),
  ('STP', 'London St Pancras International', 'London', 'United Kingdom'),
  ('PAR', 'Paris Gare du Nord', 'Paris', 'France')
ON CONFLICT (station_code) DO NOTHING;

INSERT INTO trains (
  train_number, train_name, train_type, departure_city, arrival_city,
  departure_time, arrival_time, duration_text, base_price, available_seats
)
VALUES
  (
    'Nozomi 215', 'Tokaido Shinkansen Bullet Train', 'Bullet / High Speed',
    'Tokyo', 'Kyoto', NOW() + INTERVAL '1 day 2 hours', NOW() + INTERVAL '1 day 4 hours 15 minutes',
    '2h 15m', 95.00, 140
  ),
  (
    'G102', 'Fuxing Hao High-Speed Express', 'Bullet / High Speed',
    'Shanghai', 'Beijing', NOW() + INTERVAL '1 day 3 hours', NOW() + INTERVAL '1 day 7 hours 30 minutes',
    '4h 30m', 85.00, 210
  ),
  (
    'ES-9014', 'Eurostar Channel Tunnel Cross-Border', 'High Speed',
    'London', 'Paris', NOW() + INTERVAL '2 days 5 hours', NOW() + INTERVAL '2 days 7 hours 17 minutes',
    '2h 17m', 65.00, 85
  )
ON CONFLICT DO NOTHING;

-- 6. SEED CAR RENTALS
INSERT INTO car_rentals (
  vehicle_name, category, badge, image_url, provider, rating, reviews_count,
  seats, gear_type, bags_capacity, has_ac, price_per_day, currency, pickup_city
)
VALUES
  (
    'Toyota RAV4 or similar', 'SUV', 'Popular SUV',
    'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=600',
    'Hertz', 4.80, 1420, 5, 'Automatic', 3, true, 45.00, 'USD', 'Dhaka'
  ),
  (
    'Tesla Model 3 Long Range', 'Electric / EV', 'Eco Electric',
    'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=600',
    'Sixt', 4.95, 890, 5, 'Automatic', 2, true, 59.00, 'USD', 'Dhaka'
  ),
  (
    'Hyundai Elantra', 'Economy', 'Top Value',
    'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=600',
    'Avis', 4.70, 2350, 5, 'Automatic', 2, true, 29.00, 'USD', 'Dhaka'
  ),
  (
    'Mercedes-Benz E-Class', 'Luxury', 'Executive VIP',
    'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=600',
    'Enterprise', 4.92, 640, 5, 'Automatic', 3, true, 89.00, 'USD', 'Dhaka'
  ),
  (
    'Honda Odyssey Minivan', '7-Seater Van', 'Family Pick',
    'https://images.unsplash.com/photo-1502877338535-766e1452684a?w=600',
    'Europcar', 4.85, 520, 7, 'Automatic', 5, true, 68.00, 'USD', 'Dhaka'
  )
ON CONFLICT DO NOTHING;

-- 7. SEED TOURS
INSERT INTO tours (
  title, slug, description, destination_city, destination_country,
  duration_days, duration_text, price, original_price, rating, reviews_count, is_featured
)
VALUES
  (
    '3D2N Hong Kong Skyline & Heritage Private Tour',
    '3d2n-hong-kong-skyline-heritage-private-tour',
    'Explore Victoria Peak, Star Ferry, and historical Aberdeen Fishing Village with dedicated private guide.',
    'Hong Kong', 'China', 3, '3 Days 2 Nights', 359.00, 399.00, 4.90, 328, true
  ),
  (
    '2D1N Hong Kong Disneyland Magic Escape',
    '2d1n-hong-kong-disneyland-magic-escape',
    'VIP FastPass tickets, Disney Explorers Lodge stay, and park transfers included.',
    'Hong Kong', 'China', 2, '2 Days 1 Night', 299.00, 315.00, 4.95, 512, true
  ),
  (
    'Cox''s Bazar 4D3N Beach & Island Luxury Getaway',
    'coxs-bazar-4d3n-beach-island-getaway',
    'Oceanfront resort stay, Saint Martin Island cruise, and seafood dining included.',
    'Cox''s Bazar', 'Bangladesh', 4, '4 Days 3 Nights', 180.00, 220.00, 4.85, 410, true
  ),
  (
    'Bangkok Grand Palace & Floating Market Day Tour',
    'bangkok-grand-palace-floating-market',
    'Visit Wat Phra Kaew, Wat Arun, and Damnoen Saduak floating market with private boat ride.',
    'Bangkok', 'Thailand', 1, '1 Day', 65.00, 85.00, 4.88, 620, true
  ),
  (
    'Sreemangal Rainforest & Tea Trail Expedition',
    'sreemangal-rainforest-tea-trail',
    'Lawachara National Park nature trek, seven-layer tea tasting, and tribal village visits.',
    'Sreemangal', 'Bangladesh', 2, '2 Days 1 Night', 95.00, 120.00, 4.92, 195, true
  )
ON CONFLICT (slug) DO NOTHING;

-- 8. SEED DESTINATIONS
INSERT INTO destinations (name, slug, country, image_url, description, is_trending)
VALUES
  ('Bali', 'bali', 'Indonesia', 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800', 'Tropical paradise with lush rice terraces and spiritual beaches.', true),
  ('Beijing', 'beijing', 'China', 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=800', 'Historic imperial capital home to the Forbidden City and Great Wall.', true),
  ('Shanghai', 'shanghai', 'China', 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800', 'Futuristic metropolis blending historic colonial Bund and neon skyscrapers.', true),
  ('Singapore', 'singapore', 'Singapore', 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=800', 'Garden city featuring Marina Bay Sands and world-class street food.', true),
  ('Dubai', 'dubai', 'United Arab Emirates', 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800', 'Gleaming jewel in the desert with luxury shopping and iconic architecture.', true),
  ('Cox''s Bazar', 'coxs-bazar', 'Bangladesh', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800', 'World''s longest natural unbroken sea beach stretching 120 kilometers.', true)
ON CONFLICT (slug) DO NOTHING;

-- 9. SEED AGENCIES
INSERT INTO agencies (name, slug, license_number, description, is_verified, rating)
VALUES
  ('Dream Holidays Ltd', 'dream-holidays-ltd', 'AG-88210', 'Premier international tour operator specializing in luxury vacations and family bundles.', true, 4.95),
  ('Bengal Odyssey Tours', 'bengal-odyssey-tours', 'AG-54120', 'Authentic eco-tourism and cultural expeditions across South Asia.', true, 4.88),
  ('Silk Road Journeys', 'silk-road-journeys', 'AG-91204', 'High-speed rail, trans-continental packages and bespoke travel arrangements.', true, 4.92)
ON CONFLICT (slug) DO NOTHING;

