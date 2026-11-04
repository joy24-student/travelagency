export type ScreenKind =
  | "home"
  | "search"
  | "hotel"
  | "assistant"
  | "community"
  | "trips"
  | "messages"
  | "account"
  | "settings"
  | "support"
  | "rewards"
  | "invite"
  | "list"
  | "payments"
  | "booking"
  | "premium"
  | "explore"
  | "package"
  | "live"
  | "agency";

export type UIScreen = {
  slug: string;
  source: string;
  title: string;
  subtitle: string;
  kind: ScreenKind;
  theme: "trip" | "luxe";
  icon?: keyof typeof import("@expo/vector-icons").Ionicons.glyphMap;
  hero?: string;
  image?: string;
  tabs?: string[];
  fields?: string[];
  chips?: string[];
  actions?: Array<string | { label: string; route?: string; icon?: string }>;
  benefits?: string[];
  cards?: Array<{
    title: string;
    subtitle?: string;
    meta?: string;
    price?: string;
    route?: string;
    icon?: string;
  }>;
  activeTab?: string;
};

const tripHero =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuC1YgCqAM1GLl4LkclUwZanP81m-mBUnFyNdVYP8sCHCoJJZYfMRijq1jZGABa_cUTBf0axXLSu5Kic9daI9JoER0T87XxF8FVUDAfEsd3reSujt8C8kPGBSfViR1sd6rn09V4HEJb3kreVnwC1MFBS9cKJZgwnmbf5gCG9J3y3kIEnaWQyVUyq0oJgPHrlblXcr_wZHUXc9bT3GTwIduju8AVEPpH8xk-8-zMIQTVVi2DpSBkUm3av38YxeBjxFj2cuwnYeNxvkzE";
const hotelHero =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCh85jC5zTzZO-vbceYrm4KoMqq92oMTyZAsEZIOCBA_EmYFNH2TLp7bExRXTL5Kv1QTpFUviNyoi2rExlXB67sfPy8-a4JUN41P2J_l4V3Y1ykUQTmZ8VISaQvmrzR2H72eUMS1hrA0hSZDrzCC_qy2Jxqg2b-i9ZAwaz9afQMZZ2X_mWBCt6CSDQUWiPDAAIaF9sirj3Sd74RslQ4eWnqjAgLlBSoDEXHiJ9P-LP0WSCiOWc3vfh-00qfruMHROuD9nyuNlCXHdU";
const flightHero =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCEKlLoLWT9L5kPrBKJukSJHUn1JlTROFKt32qkPk-yxOUxmzQw-entkdmJfeF_faBcNl0G9aNflEOqhpkY_cAzNFJpi24q9sJLfD8xs6y0IGTjy9uDdi6-pzXbYiw-zgZzurJc5AR0Emzmp1Br0eHzwA8d79YReMDx08Si4CkdG3B9caOiT09sOVWaKj266tMBbjUm2ELouOGkKt-s9Yc-sOicmd-FSCCTgb_zIDg6VGY3de45baaUUbIhTFHuKuz2F7rozW1NfsU";
const luxeHero =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuC0IOIEbK_8Ik65WK9Cs3tSYR1CDsYtGgMy3bzWD7dxBCWdGHIqDxwa3up3fygyQ6_jz8Qym8XvqN4riPXlyuoiyG_s874WeTkiMRBjHN-FtYgmav5BCmRuunN9uRikFHj5hrvuEbB2A2PpNQEstLEBkQPlq0RVs2ySeGzles0qXUY7YicPhKBeQpJW7X6nnrKBpBHbiSZJVAF2NRiSeZvKbKRiRfs21AW2OizwISk82Gfdob-b4IqZoOBmGICpwnyyRgr8slTOGIw";
const communityHero =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBl0iWhRKgwp1vOz1VwEthPCmIbts-xjwFDoFR960YggifC2bxX3UCnh6GqtIG-EeBZOTLhqbkevh-tJw_iWryFwztTtMT6kGL-dXlElwapIRFwnIazmtqv6RM63bTpUvfPP5r7OApHatnA7CZ8lQQ0QHhJqizklIeEX992wqxoQoDVNgbnQu7E6SCzbsuU__dVlzs2_FSSKUio6DIblX9BxW6v2KfgDqtQidRQIT2VgFg9ZYYyqenUHX8IEg9YQlylDFC43ZL2c-k";
const trainHero =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuASaSaMI_5VlFnTP8K_LAfgTjP1SJJaxAK6W3jaAJn9d1Sv6TIi13rOUaMn7IwnEuCIriHYLbLCL5aGpKt5eesP5eUQp7uBSq64D6Ve8RLZRzeiNPM2teNKXe0BF47OaJ3K8-HsYSWDAp2XUIlqJPZRbJo5xsRFVx8b40fDvhlBG5TOJY6B179cll5ShqHykdahYD6PTp-CWONca53Uxr8wvidON1A9WwHcR0Lieb2LiRC83wUIHnGz15gD91XJl6qMkZfGdck2KP8";
const tourHero =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDtDVekIcLmtgCV-sfgIV-cZBtZJuRPRNAWgmgdWUcuoh_XbdvdDYOeEbi2AECOCmmBnWYmB9DoCeB-TCyTHxDwg0j2QJNvjBD98GYAvlf5qUqRCqWJPv0lRgcFzCyp1DtInvqCcelXiukqEg63AwPfke3bFyzFZj7-A7ftnVjZeW_u8WiuwK1eb3HioZLyW_Q2JZZGMD_epEPj3Y4v9gAInON92AmoVOfY8yfHKQ-uXsMxMugTR7ljoJ7jbyH3Q5Ez9xpj8dDOIVk";

export const screens: UIScreen[] = [
  {
    slug: "home",
    source: "home/personalized",
    title: "Home",
    subtitle:
      "Personalized dashboard with trending destinations, deals, and AI recommendations.",
    kind: "home",
    theme: "trip",
    activeTab: "Home",
  },
  {
    slug: "explore",
    source: "explore/destinations",
    title: "Explore",
    subtitle:
      "Destination details with gallery, weather, budget, reviews, and safety scores.",
    kind: "explore",
    theme: "trip",
    activeTab: "Home",
  },
  {
    slug: "search",
    source: "search/global",
    title: "Search",
    subtitle:
      "Global search with voice, smart filters, compare, and saved searches.",
    kind: "search",
    theme: "trip",
    activeTab: "Home",
  },
  {
    slug: "packages",
    source: "packages/detail",
    title: "Packages",
    subtitle:
      "Full package detail with itinerary, hotel, meals, add-ons, reviews, and cancellation.",
    kind: "package",
    theme: "trip",
    activeTab: "Home",
  },
  {
    slug: "live",
    source: "live/streams",
    title: "Live",
    subtitle:
      "Agency live tours, influencer live, video calls, voice calls, group calls.",
    kind: "live",
    theme: "trip",
    activeTab: "Messages",
  },
  {
    slug: "booking-system",
    source: "supabase/booking-system",
    title: "Booking System",
    subtitle:
      "Traveler details, passengers, booking flow, invoices, vouchers, timeline, and refund tracking.",
    kind: "booking",
    theme: "trip",
    activeTab: "My Trips",
  },
  {
    slug: "trip-home-sticky-1",
    source: "trip.com_mobile_with_precise_sticky_scroll_1/code.html",
    title: "Trip.com",
    subtitle:
      "Hotels, flights, trains, package tours, and destination discovery.",
    kind: "home",
    theme: "trip",
    hero: tripHero,
    tabs: ["Hotels", "Flights", "Flight + Hotel", "Trains"],
    chips: [
      "Rome",
      "Vacation Rentals",
      "Attractions & Tours",
      "Car Rentals",
      "+7 more",
    ],
    actions: ["Deals", "Events", "Trip.Planner", "Trending"],
    activeTab: "Home",
  },
  {
    slug: "trip-home-sticky-2",
    source: "trip.com_mobile_with_precise_sticky_scroll_2/code.html",
    title: "Trip.com",
    subtitle:
      "Silver member home screen with sticky search and travel services.",
    kind: "home",
    theme: "trip",
    hero: tripHero,
    tabs: ["Hotels", "Flights", "Flight + Hotel", "Trains"],
    chips: ["Rome", "Deals", "Events", "Trending"],
    actions: [
      "Vacation Rentals",
      "Attractions & Tours",
      "Car Rentals",
      "Package Tours",
    ],
    activeTab: "Home",
  },
  {
    slug: "trip-mobile-interface",
    source: "trip.com_mobile_interface_replicated_2/code.html",
    title: "Trip.com",
    subtitle: "Replicated mobile services dashboard and destination grid.",
    kind: "home",
    theme: "trip",
    hero: tripHero,
    tabs: ["Hotels", "Flights", "Flight + Hotel", "Trains"],
    chips: ["Rome", "Deals", "Events", "Trip.Planner"],
    actions: ["Vacation Rentals", "Attractions", "Car Rentals", "+7 more"],
    activeTab: "Home",
  },
  {
    slug: "flights",
    source: "trip.com_combined_pixel_perfect_flights_screen/code.html",
    title: "Discover the beauty of China",
    subtitle: "Book with China Eastern and get a free flight within China.",
    kind: "search",
    theme: "trip",
    hero: flightHero,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBhfmYBlSwa3vWf-fBQv5t9kAF3yYbl0X6ANdLt3eUwbHWXGkAZgkHmwRPpOI9TiCfX9VSdiZ_rYFHMe-PFZjedswG0-kaF4xwWoN8wyvxHrK5h4ZsTS5r72zfU72t8ZrFJBVelBIupJEqBJfV5WwPpcPrOZWxlVVQdKW-jY2KXk0ogqAWSir8V8KmM-_vTALJg8AJUTW1Qg6Vijv4Tihq3V7ed59EWLkYGsuNZp46WENNF8R0nQAR5WylcGoOrBjpoAxfPEe7hdDI",
    tabs: ["One-way", "Round-trip", "Multi-city"],
    fields: [
      "Tokyo (HND/NRT) - Departure",
      "Los Angeles (LAX) - Arrival",
      "Tue, Jun 2 · Departure date",
      "1 passenger · Economy/premium",
    ],
    actions: ["Search anywhere", "Price alerts", "Flight + Hotel", "More"],
    benefits: [
      "FREE flight within China with China Eastern",
      "Save 6% on avg. when bundling Flight + Hotel",
      "Price match guarantee · Instant e-ticket",
    ],
    cards: [
      {
        title: "Tokyo (NRT) ➔ Los Angeles (LAX)",
        subtitle: "Japan Airlines · Nonstop · 10h 15m",
        meta: "Economy · Tue, Jun 2 · Direct",
        price: "$480",
      },
      {
        title: "Singapore (SIN) ➔ London Heathrow (LHR)",
        subtitle: "Singapore Airlines · World's top-rated service",
        meta: "13h 25m · Meal & Wi-Fi included",
        price: "$620",
      },
      {
        title: "Dhaka (DAC) ➔ Bangkok (BKK)",
        subtitle: "Biman Bangladesh Airlines · 2h 30m Direct",
        meta: "30kg checked baggage included",
        price: "$210",
      },
    ],
    activeTab: "Home",
  },
  {
    slug: "search-stays",
    source: "trip.com_combined_pixel_perfect_hotels_discovery/code.html",
    title: "Search Stays",
    subtitle: "New user benefits, stay discovery, and inspiration cards.",
    kind: "hotel",
    theme: "trip",
    hero: hotelHero,
    fields: [
      "Enter a destination or property",
      "Check-in: Tomorrow · 2 nights",
      "1 room · 2 adults · 0 children",
    ],
    actions: ["Saved", "Bookings", "My offers", "Price Alerts"],
    benefits: [
      "Up to $15 off · 3-night discount",
      "Up to $12 off · New user promo code",
      "Up to $10 off · First booking discount",
    ],
    cards: [
      {
        title: "Emperor Qinshihuang's Mausoleum Site Museum",
        subtitle: "Walk through the ranks of a buried army",
        meta: "China · 200+ stays",
      },
      {
        title: "The Metropolitan Museum of Art",
        subtitle: "World-class art collections and exhibits",
        meta: "United States · 700+ stays",
      },
      {
        title: "Badaling Great Wall",
        subtitle: "Iconic historical monument and panoramic views",
        meta: "China · 300+ stays",
      },
    ],
    activeTab: "Home",
  },
  {
    slug: "hotels-homes",
    source: "trip.com_hotels_homes_replicated/code.html",
    title: "Hotels & Homes",
    subtitle: "Destination, dates, rooms, adults, children, and hotel offers.",
    kind: "hotel",
    theme: "trip",
    hero: hotelHero,
    fields: [
      "Enter a destination or property",
      "Mon, Jun 1 - Tue, Jun 2 (1 night)",
      "1 room · 2 adults · 0 children",
    ],
    actions: ["Saved", "Bookings", "My offers", "Price Alerts"],
    benefits: [
      "Up to $15 off · 3-night discount",
      "Up to $12 off · New user promo code",
      "Exclusive member rates on homes",
    ],
    cards: [
      {
        title: "Sea Pearl Beach Resort & Spa",
        subtitle: "Luxury beachfront stay with 5-star private pool villas",
        meta: "Cox's Bazar · ⭐ 4.9",
        price: "$120/night",
      },
      {
        title: "Pan Pacific Sonargaon Dhaka",
        subtitle: "Centrally located premium hospitality & wellness oasis",
        meta: "Dhaka · ⭐ 4.8",
        price: "$145/night",
      },
      {
        title: "Grand Sultan Tea Resort & Golf",
        subtitle: "Scenic rainforest resort with world-class golf amenities",
        meta: "Sreemangal · ⭐ 4.9",
        price: "$130/night",
      },
    ],
    activeTab: "Home",
  },
  {
    slug: "luxestay-hotels",
    source: "luxestay_hotels_homes/code.html",
    title: "Hotels & Homes",
    subtitle: "Curated sanctuaries for the discerning traveler.",
    kind: "hotel",
    theme: "luxe",
    hero: "https://lh3.googleusercontent.com/aida-public/AB6AXuDIab50A_VLkm-Y_5Xe6aKNSOuqZIK1owDhEvEfRRUGmN2FuHJaSJNwnHZLmh8TLzYB204ScV0mUMKmuUczmRwTJPz_5nm2ZYp5PYBWGMsc19epfOJb3Ssz1407UhQ7tPAeuQ0WJZuZp-Qh595FnzkXAkWTc9wxIcFPawGLV2RMA0KQ687Ms6g4wH0MmnsuXjX-2605MlmMac-cpIr9csLBRYhPA_RrLx6FRGQM4MFF8zKXMEQfcEf7wn-kS3PSzQIjf3HwUMb3chs",
    fields: [
      "Destination",
      "Where are you going?",
      "Dates",
      "Oct 12 - 19",
      "Guests",
      "2 Guests",
    ],
    actions: ["Saved", "Bookings", "Offers", "Concierge"],
    activeTab: "Home",
  },
  {
    slug: "events",
    source: "events/code.html",
    title: "Events.",
    subtitle: "Concerts and Exhibitions",
    kind: "explore",
    theme: "trip",
    hero: "",
  },
  {
    slug: "trip-planner",
    source: "trip_planner/code.html",
    title: "Trip.Planner",
    subtitle: "Plan your trip with AI",
    kind: "assistant",
    theme: "trip",
    hero: "",
  },
  {
    slug: "ai-assistant",
    source: "luxestay_ai_assistant/code.html",
    title: "Hello, I'm Lumi",
    subtitle: "Where shall we curate your next masterpiece of a journey today?",
    kind: "assistant",
    theme: "luxe",
    hero: luxeHero,
    chips: ["Plan 5 days in Tokyo", "Budget for Italy"],
    cards: [
      {
        title: "AI Trip Planner",
        subtitle: "Bespoke itineraries crafted in seconds.",
      },
      {
        title: "AI Budget Planner",
        subtitle: "Smart cost allocation and real-time tracking.",
      },
      {
        title: "AI Route Planner",
        subtitle: "Optimized logistics for seamless movement.",
      },
      {
        title: "Travel Insights",
        subtitle: "Global flight trends and hidden market shifts.",
      },
    ],
    activeTab: "Assistant",
  },
  {
    slug: "travel-community-refined",
    source: "refined_travel_community_ui/code.html",
    title: "Travel Community",
    subtitle: "Creator stories, destination posts, and bookable experiences.",
    kind: "community",
    theme: "luxe",
    hero: communityHero,
    chips: ["Marcus", "Elena", "Julian", "Sasha"],
    cards: [
      {
        title: "Amalfi Coast, Italy",
        subtitle: "Julianna V. | Influencer",
        meta: "Book this Experience",
      },
    ],
    activeTab: "Post",
  },
  {
    slug: "travel-community-posts",
    source: "travel_community_posts/code.html",
    title: "Travel Community",
    subtitle: "Post feed with profile chips, reactions, and saved experiences.",
    kind: "community",
    theme: "luxe",
    hero: communityHero,
    chips: ["Marcus", "Elena", "Julian", "Sasha"],
    cards: [
      {
        title: "Amalfi Coast, Italy",
        subtitle: "Julianna V. | Influencer",
        meta: "Book this Experience",
      },
    ],
    activeTab: "Post",
  },
  {
    slug: "my-trips",
    source: "trip.com_combined_pixel_perfect_my_trips_screen/code.html",
    title: "My Trips",
    subtitle: "No upcoming trips, memories, and destination posts.",
    kind: "trips",
    theme: "trip",
    hero: "https://lh3.googleusercontent.com/aida-public/AB6AXuARiu_Ao9hqqvKLrJUdonbXOOP3j5jfIU0h7a0rD-69-k0gwBjSe6iSuhVtz21uTg3QnsWq_nnWWWX1FgIBBtAowizg-vVs5Qh0de-UcOBzGDSoj5ts2M3JF5VJocdEj8QuTt8pBMM9uGqVC9ZL1crASht2LeL4IBS68VvX6e_gMM0j15KoA_snxpKzVfEl5I68HWcMjizCTqpFO91-VildSX6ZX0R9VFjB5Q9FaZYOmBW4qxSanDRqGj4KpvO3uTBxH3Il9--akUQ",
    cards: [
      {
        title: "No upcoming trips",
        subtitle: "Memories",
        meta: "Shanghai Disneyland: best attractions",
      },
    ],
    activeTab: "My Trips",
  },
  {
    slug: "messages",
    source: "trip.com_messages_screen_replicated/code.html",
    title: "Messages",
    subtitle: "Notifications from the last 3 months.",
    kind: "messages",
    theme: "trip",
    cards: [
      {
        title: "Recent notifications",
        subtitle: "Travel updates and reminders",
        meta: "11:13 PM",
      },
      {
        title: "Booking alerts",
        subtitle: "Price changes and account messages",
        meta: "10:52 PM",
      },
    ],
    activeTab: "Messages",
  },
  {
    slug: "trains",
    source: "trip.com_trains_replicated/code.html",
    title: "Trains",
    subtitle: "Trains, buses, passes, date, return trip, and passenger search.",
    kind: "search",
    theme: "trip",
    hero: trainHero,
    tabs: ["Trains", "Buses", "Passes"],
    fields: [
      "Departure station (e.g. Tokyo / Beijing)",
      "Arrival station (e.g. Kyoto / Shanghai)",
      "Tue, Jun 2 · One-way",
      "1 passenger",
    ],
    actions: ["High Speed Rail", "Overnight Sleeper", "Eurail Pass", "JR Rail Pass"],
    benefits: [
      "Official rail operator partnerships",
      "Instant e-ticket delivery to phone",
      "Multiple currencies accepted · No foreign fees",
      "24/7 Multi-language customer support",
    ],
    cards: [
      {
        title: "Tokaido Shinkansen (Bullet Train)",
        subtitle: "Tokyo ➔ Shin-Osaka · High frequency express",
        meta: "2h 15m · High Speed Rail",
        price: "$98",
      },
      {
        title: "Beijing-Shanghai High Speed Railway",
        subtitle: "Beijing South ➔ Shanghai Hongqiao · Fuxing Hao 350 km/h",
        meta: "4h 18m · Direct Bullet Train",
        price: "$82",
      },
      {
        title: "Eurostar International Train",
        subtitle: "London St Pancras ➔ Paris Gare du Nord",
        meta: "2h 17m · Cross-border rail",
        price: "$65",
      },
    ],
    activeTab: "Home",
  },
  {
    slug: "private-tours-search",
    source: "trip.com_private_tours_search_replicated/code.html",
    title: "Private Tours",
    subtitle: "Custom China and Asia itinerary search.",
    kind: "search",
    theme: "trip",
    chips: ["Zhangjiajie", "Beijing", "Shanghai", "Japan", "Chengdu"],
    fields: ["Flexible dates", "Travel experts", "Customize my trip"],
    cards: [
      {
        title: "Popular China itineraries",
        subtitle: "Cities & Discovery",
        meta: "Recommended 13-15 days",
      },
    ],
    activeTab: "Home",
  },
  {
    slug: "recommended-tours",
    source: "trip.com_recommended_tours_replicated/code.html",
    title: "Private Tours",
    subtitle: "Filterable private tours list with prices and promos.",
    kind: "list",
    theme: "trip",
    hero: tourHero,
    tabs: ["Recommended", "Best Rated", "Custom Tours"],
    chips: ["Sort by", "Filter", "Duration/dates", "Budget", "Service", "Departure city"],
    actions: ["Private Tours", "Day Trips", "Attraction Tickets", "Customized Tours"],
    benefits: [
      "Private vehicle & dedicated guide",
      "Flexible cancellation policy",
      "Customizable daily itineraries",
    ],
    cards: [
      {
        title: "3D2N Hong Kong Skyline & Heritage Tour",
        subtitle: "Explore Victoria Peak, Star Ferry, and local delicacies",
        meta: "Private Tour · Verified English Guide",
        price: "$359",
      },
      {
        title: "2D1N Hong Kong Disneyland Magic Escape",
        subtitle: "VIP entry tickets, hotel stay, and station transfer",
        meta: "Instant Confirmation · Mobile Voucher",
        price: "$299 ($16 off)",
      },
      {
        title: "1-Day Bangkok Temple & Grand Palace Explorer",
        subtitle: "Wat Arun, Wat Phra Kaew, and Chao Phraya cruise",
        meta: "Small Group · Hotel Pick-up",
        price: "$85",
      },
    ],
    activeTab: "Home",
  },
  {
    slug: "car-rentals",
    source: "trip.com_car_rentals_replicated/code.html",
    title: "Car Rentals",
    subtitle: "Compare top car rental companies worldwide with no hidden fees.",
    kind: "list",
    theme: "trip",
    hero: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200",
    tabs: ["Same Drop-off", "Different Drop-off"],
    fields: [
      "Pick-up location (Airport or City)",
      "Pick-up date: Tomorrow 10:00 AM",
      "Drop-off date: 3 days later 10:00 AM",
      "Driver age: 25 - 70 years",
    ],
    chips: ["SUV", "Economy", "Electric / EV", "Luxury", "7-Seater Van", "Zero Deductible"],
    actions: ["Airport Rentals", "Self-Drive", "Chauffeur", "Price Match"],
    benefits: [
      "Free cancellation up to 48 hours",
      "No credit card fees",
      "Zero deposit available",
      "24/7 Roadside emergency assistance",
    ],
    cards: [
      {
        title: "Toyota RAV4 or similar (SUV)",
        subtitle: "5 seats · Automatic · AC · 2 large bags",
        meta: "Free cancellation · Unlimited mileage",
        price: "$45/day",
      },
      {
        title: "Tesla Model 3 (Electric)",
        subtitle: "5 seats · Long Range · Autopilot included",
        meta: "Zero emissions · Free supercharging credits",
        price: "$59/day",
      },
      {
        title: "Hyundai Elantra (Economy)",
        subtitle: "5 seats · Great fuel economy · Automatic",
        meta: "Instant confirmation · Full protection available",
        price: "$29/day",
      },
      {
        title: "Mercedes-Benz E-Class (Executive)",
        subtitle: "5 seats · Premium interior · Luxury comfort",
        meta: "VIP pick-up service · Full insurance",
        price: "$89/day",
      },
    ],
    activeTab: "Home",
  },
  {
    slug: "customer-support",
    source: "trip.com_customer_support_replicated/code.html",
    title: "Customer Support",
    subtitle: "Service Chat, FAQs, hot topics, and category support.",
    kind: "support",
    theme: "trip",
    tabs: ["Flights", "Hotels & Homes", "Trains"],
    actions: [
      "Booking & Price",
      "Ticketing & Payment",
      "Booking Query",
      "Passenger Info",
    ],
    cards: [
      { title: "Are there any flight ticket promotions going on?" },
      { title: "How do I change my ticket?" },
      { title: "How can I cancel my flight ticket?" },
    ],
    activeTab: "Messages",
  },
  {
    slug: "partner-program",
    source: "trip.com_partner_program_replicated/code.html",
    title: "Join Us",
    subtitle: "Partner with Trip.com and reach travelers worldwide.",
    kind: "list",
    theme: "trip",
    cards: [
      {
        title: "Hotels, Homes, and More",
        subtitle: "Reach 600,000,000+ travelers worldwide",
        meta: "Join",
      },
      {
        title: "Attractions & Tours",
        subtitle: "210,000+ products in 2,000+ destinations",
        meta: "Join",
      },
      {
        title: "More Travel Products",
        subtitle: "Car rental, transfers, visas, cruises, custom trips",
        meta: "Join",
      },
    ],
    activeTab: "Account",
  },
  {
    slug: "invite-earn",
    source: "trip.com_invite_earn_replicated/code.html",
    title: "Invite & earn",
    subtitle: "Refer friends. Earn up to $100.",
    kind: "invite",
    theme: "trip",
    benefits: [
      "Give your friend up to 20% off",
      "You earn $10 each time they book",
      "VIP",
    ],
    cards: [
      { title: "0", subtitle: "In progress" },
      { title: "0", subtitle: "Completed" },
      { title: "$0", subtitle: "Total earned" },
    ],
    activeTab: "Account",
  },
  {
    slug: "rewards",
    source: "trip.com_rewards_replicated/code.html",
    title: "Silver",
    subtitle: "Trip.com Rewards member tier and new user package.",
    kind: "rewards",
    theme: "trip",
    benefits: ["0/1 Booking", "Update your member profile", "New user package"],
    cards: [
      { title: "Hotels & Homes", subtitle: "Enjoy", price: "10% off" },
      { title: "Hotels & Homes", subtitle: "Up to", price: "20% off" },
    ],
    activeTab: "Account",
  },
  {
    slug: "rewards-login",
    source: "trip.com_rewards_login_replicated/code.html",
    title: "Sign in for member rewards",
    subtitle:
      "Get Member Benefits and continue with Google, email, or Facebook.",
    kind: "account",
    theme: "trip",
    actions: [
      "Continue with Google",
      "Continue with email",
      "Continue with Facebook",
    ],
    activeTab: "Account",
  },
  {
    slug: "premium-account",
    source: "trip.com_premium_account_experience/code.html",
    title: "Trip.com Member",
    subtitle: "Silver member profile, promo codes, creator center, and perks.",
    kind: "account",
    theme: "trip",
    benefits: ["8 Promo Codes", "Earn 25 Trip Coins", "Perks"],
    cards: [
      {
        title: "Manage account",
        subtitle: "Your exclusive new-user special discounts",
      },
      { title: "Creator center" },
      { title: "About Trip.com" },
      { title: "Terms & conditions" },
    ],
    activeTab: "Account",
  },
  {
    slug: "account-security",
    source: "trip.com_account_security_replicated/code.html",
    title: "Account Security",
    subtitle: "Security, payment settings, and member profile cards.",
    kind: "settings",
    theme: "trip",
    cards: [
      {
        title: "Account Security",
        subtitle: "Password, phone, email, and login methods",
      },
      {
        title: "Payment Settings",
        subtitle: "Cards, billing, and verification",
      },
      {
        title: "Member Profile",
        subtitle: "Personal details and member benefits",
      },
    ],
    activeTab: "Account",
  },
  {
    slug: "settings",
    source: "trip.com_settings_replicated/code.html",
    title: "Settings",
    subtitle:
      "Localization, account, interface, notifications, accessibility, and legal settings.",
    kind: "settings",
    theme: "trip",
    cards: [
      { title: "Language", subtitle: "English" },
      { title: "Country or Region", subtitle: "United States" },
      { title: "Currency", subtitle: "USD" },
      { title: "Units", subtitle: "Imperial (miles, ft2, lb)" },
      { title: "Temperature Scale", subtitle: "Fahrenheit" },
      { title: "Time format", subtitle: "12-hour (am/pm)" },
      { title: "Manage my account" },
      { title: "Dark Theme" },
      { title: "Notifications" },
      { title: "Accessibility" },
    ],
    activeTab: "Account",
  },
];
