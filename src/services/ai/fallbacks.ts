import { calculateBudgetDistribution } from "./budgetPlanner";
import type {
  TripPlan,
  TripPlannerEngineRequest,
  TripDay,
} from "./types";

// ─── Curated Destination Databases ───────────────────────────────────────────

interface CuratedTemplate {
  title: string;
  summary: string;
  days: Omit<TripDay, "date">[];
  tips: string[];
  packingChecklist: string[];
}

const CURATED_ITINERARIES: Record<string, CuratedTemplate> = {
  "cox's bazar": {
    title: "Cox's Bazar Coastal Haven & Marine Drive Escape",
    summary:
      "Experience the world's longest natural sea beach, breathtaking Marine Drive vistas, Himchari waterfalls, fresh Bay of Bengal seafood, and coral island tranquil vibes.",
    days: [
      {
        day: 1,
        theme: "Arrival & Sunset by Kolatoli Beach",
        activities: [
          {
            time: "10:00 AM",
            activity: "Hotel check-in & refreshing coconut water welcome",
            location: "Kolatoli Beach Road",
            coordinates: { latitude: 21.4272, longitude: 92.0058 },
            notes: "Freshen up after journey; soak in the sea breeze.",
          },
          {
            time: "03:30 PM",
            activity: "Stroll along Laboni Point & Beach Market",
            location: "Laboni Beach",
            coordinates: { latitude: 21.4369, longitude: 91.9781 },
            notes: "Explore handmade shell souvenirs, beach crafts, and sea shells.",
          },
          {
            time: "05:45 PM",
            activity: "Golden Hour Sunset Watching & Beachside Relax",
            location: "Sugandha Point",
            coordinates: { latitude: 21.4215, longitude: 91.9825 },
            notes: "Spectacular crimson sunset over the Bay of Bengal waves.",
          },
        ],
        meals: [
          {
            type: "breakfast",
            suggestion: "Traditional Paratha, Egg Bhaji, and Milk Tea",
            dishName: "Dim Bhaji & Paratha",
            restaurant: "Kolatoli Beach Diner",
          },
          {
            type: "lunch",
            suggestion: "Steamed Rupchanda Fish, Vorta Platter, and Plain Rice",
            dishName: "Fresh Rupchanda Fry & Chepa Shutki Vorta",
            restaurant: "Poushee Restaurant",
          },
          {
            type: "dinner",
            suggestion: "Grilled Coral Fish, Crab Curry, and Naan",
            dishName: "Fresh Bay Coral BBQ",
            restaurant: "Jhaubon Restaurant",
          },
        ],
        accommodation: "Sea-Facing Eco Beach Resort, Kolatoli",
      },
      {
        day: 2,
        theme: "Marine Drive, Himchari Hill & Inani Coral Beach",
        activities: [
          {
            time: "09:00 AM",
            activity: "Open-roof Chander Gari drive down Marine Drive",
            location: "Cox's Bazar Marine Drive",
            coordinates: { latitude: 21.3524, longitude: 92.0321 },
            notes: "One of the most scenic coastal highways in South Asia.",
          },
          {
            time: "11:00 AM",
            activity: "Hike Himchari National Park & Waterfall",
            location: "Himchari Eco Park",
            coordinates: { latitude: 21.3562, longitude: 92.0294 },
            notes: "Climb the hilltop stairs for a 360-degree panorama of ocean & hills.",
          },
          {
            time: "02:30 PM",
            activity: "Explore Inani Coral Beach & Natural Rock Pools",
            location: "Inani Beach",
            coordinates: { latitude: 21.2291, longitude: 92.0526 },
            notes: "Unique sharp coral stones and tranquil turquoise waters.",
          },
        ],
        meals: [
          {
            type: "breakfast",
            suggestion: "Fluffy Luchi, Dal Chorchori, and Fresh Papaya Juice",
            restaurant: "Resort Beach Cafe",
          },
          {
            type: "lunch",
            suggestion: "Traditional Chittagong Mezbani Beef or Tiger Prawn Bhuna",
            restaurant: "Inani Marine Resto",
          },
          {
            type: "dinner",
            suggestion: "Beachside Lobster BBQ & Fried Rice",
            restaurant: "Mermaid Beach Cafe, Pechar Dwip",
          },
        ],
        accommodation: "Mermaid Eco Resort / Long Beach Hotel",
      },
      {
        day: 3,
        theme: "Maheshkhali Island & Local Burmese Market",
        activities: [
          {
            time: "08:30 AM",
            activity: "Speedboat excursion to Maheshkhali Island",
            location: "Kasturi Ghat to Maheshkhali",
            coordinates: { latitude: 21.5173, longitude: 91.9567 },
            notes: "Visit the ancient Adinath Temple dedicated to Shiva on Mainak Hill.",
          },
          {
            time: "01:00 PM",
            activity: "Visit Buddhist Rakhine Temple & Golden Pagoda",
            location: "Ramu Rubber Garden & Pagoda",
            coordinates: { latitude: 21.4391, longitude: 92.1009 },
            notes: "Admire bronze Buddha statues and serene monastery gardens.",
          },
          {
            time: "04:30 PM",
            activity: "Shopping at Cox's Bazar Burmese Market",
            location: "Burmese Market Road",
            coordinates: { latitude: 21.4385, longitude: 91.9748 },
            notes: "Shop for handloom shawls, dried fish, pickles, and wooden handicrafts.",
          },
        ],
        meals: [
          {
            type: "breakfast",
            suggestion: "Khichuri with fried eggplant and duck egg",
            restaurant: "Local Island Eatery",
          },
          {
            type: "lunch",
            suggestion: "Hilsha Mustard Curry with aromatic Kalijeera rice",
            restaurant: "Kasturi Waterfront Diner",
          },
          {
            type: "dinner",
            suggestion: "Tandoori Pomfret with Garlic Naan and Fresh Salad",
            restaurant: "Casablanca Restaurant",
          },
        ],
        accommodation: "Ocean Paradise Hotel & Resort",
      },
    ],
    tips: [
      "Carry sunscreen SPF 50+ and sunglasses during the Marine Drive excursion.",
      "Always check beach flag safety warnings before swimming in the ocean.",
      "Download bKash or Nagad apps for quick, contactless local vendor payments.",
      "Bargain politely when riding open Chander Gari or battery easy-bikes.",
    ],
    packingChecklist: [
      "Breathable cotton clothes",
      "Flip-flops & beach sandals",
      "Waterproof phone pouch",
      "Power bank for long coastal drives",
    ],
  },

  sylhet: {
    title: "Sylhet & Sreemangal Lush Tea Garden Expedition",
    summary:
      "Immerse yourself in endless rolling tea gardens, the enchanted freshwater swamp forest of Ratargul, crystal clear Jaflong rivers, and fragrant Shatkora cuisine.",
    days: [
      {
        day: 1,
        theme: "Arrival & Historic Hazrat Shah Jalal Shrine",
        activities: [
          {
            time: "10:30 AM",
            activity: "Check into boutique guesthouse & refresh",
            location: "Sylhet City Center",
            coordinates: { latitude: 24.8949, longitude: 91.8687 },
            notes: "Rest and enjoy fragrant Sylheti welcome tea.",
          },
          {
            time: "03:00 PM",
            activity: "Explore Dargah Hazrat Shah Jalal & Holy Springs",
            location: "Shah Jalal Mazar Sharif",
            coordinates: { latitude: 24.9038, longitude: 91.8685 },
            notes: "Historical 14th-century spiritual sanctuary with sacred ponds and pigeons.",
          },
          {
            time: "05:30 PM",
            activity: "Sunset stroll across Keane Bridge & Surma River",
            location: "Keane Bridge, Surma River",
            coordinates: { latitude: 24.8872, longitude: 91.8682 },
            notes: "Iconic colonial clock tower and serene waterfront views.",
          },
        ],
        meals: [
          {
            type: "breakfast",
            suggestion: "Sylheti Bakarkhani, Halwa, and Malai Cha",
            restaurant: "Pansi Sweets",
          },
          {
            type: "lunch",
            suggestion: "Beef with local aromatic Shatkora citrus, Chitol fish kofta",
            dishName: "Shatkora Beef Bhuna",
            restaurant: "Pansi Inn Restaurant",
          },
          {
            type: "dinner",
            suggestion: "Kacchi Biryani with Borhani and Shahi Firni",
            restaurant: "Woondaal King Kebab",
          },
        ],
        accommodation: "Hotel Noorjahan Grand / Rose View Hotel",
      },
      {
        day: 2,
        theme: "Ratargul Swamp Forest & Jaflong Zero Point",
        activities: [
          {
            time: "07:30 AM",
            activity: "Wooden boat safari through Ratargul Freshwater Swamp",
            location: "Ratargul Swamp Forest",
            coordinates: { latitude: 25.0003, longitude: 91.9304 },
            notes: "The 'Amazon of Bangladesh' with submerged Koroch and Millettia trees.",
          },
          {
            time: "01:00 PM",
            activity: "Drive through Khasia tribal villages to Jaflong",
            location: "Jaflong Piyain River",
            coordinates: { latitude: 25.1633, longitude: 92.0167 },
            notes: "View Meghalaya hills, cascading waterfalls, and crystal boulder riverbeds.",
          },
          {
            time: "04:30 PM",
            activity: "Taste legendary Seven-Layer Colored Tea at Nilkantha",
            location: "Nilkantha Tea Cabin",
            coordinates: { latitude: 24.3065, longitude: 91.7299 },
            notes: "World-famous 7-layer tea prepared with natural herbs and tea leaves.",
          },
        ],
        meals: [
          {
            type: "breakfast",
            suggestion: "Hot Luchi with spiced chola dal and freshly brewed black tea",
            restaurant: "Swamp Edge Dhabba",
          },
          {
            type: "lunch",
            suggestion: "Piyain River freshwater Boal Fish Curry with mustard greens",
            restaurant: "Jaflong River View Cafe",
          },
          {
            type: "dinner",
            suggestion: "Spiced Roasted Duck Curry with Steamed Rice",
            restaurant: "Panch Bhai Restaurant",
          },
        ],
        accommodation: "Nazimgarh Wilderness Resort, Lalakhal",
      },
      {
        day: 3,
        theme: "Sreemangal Tea Estates & Lawachara Rainforest",
        activities: [
          {
            time: "08:00 AM",
            activity: "Trek through Lawachara National Park",
            location: "Lawachara Rain Forest",
            coordinates: { latitude: 24.3262, longitude: 91.7842 },
            notes: "Lookout for rare Hoolock Gibbons, barking deer, and century-old canopy.",
          },
          {
            time: "11:30 AM",
            activity: "Cycling through Finlay & BTRI Tea Gardens",
            location: "BTRI Tea Estate, Sreemangal",
            coordinates: { latitude: 24.3121, longitude: 91.7348 },
            notes: "Endless rolling green carpets; observe traditional tea pluckers.",
          },
          {
            time: "03:30 PM",
            activity: "Visit Monipuri Craft & Handloom Village",
            location: "Ramnagar Manipuri Para",
            coordinates: { latitude: 24.3211, longitude: 91.7456 },
            notes: "Witness authentic loom weaving and purchase traditional handmade shawls.",
          },
        ],
        meals: [
          {
            type: "breakfast",
            suggestion: "Freshly made hot Roti, fried eggs, and Sreemangal estate green tea",
            restaurant: "Grand Sultan Garden Cafe",
          },
          {
            type: "lunch",
            suggestion: "Deshi Chicken curry with bamboo shoot fry and garden salad",
            restaurant: "Kutumbari Restaurant Sreemangal",
          },
          {
            type: "dinner",
            suggestion: "Barbecue grilled chicken with rumali roti and minted yogurt dip",
            restaurant: "Shanti Bari Eco Kitchen",
          },
        ],
        accommodation: "Grand Sultan Tea Resort & Golf, Sreemangal",
      },
    ],
    tips: [
      "Carry insect repellent and sturdy walking shoes for swamp forest and rainforest trails.",
      "Wake up early (around 7 AM) for Ratargul boat rides before crowds arrive.",
      "Do not disturb wildlife inside Lawachara National Park.",
      "Bring light warm clothing if visiting between November and February.",
    ],
    packingChecklist: [
      "Light waterproof rain jacket",
      "Comfortable trail running shoes",
      "Mosquito repellent spray",
      "Camera with telephoto lens for birds",
    ],
  },

  bali: {
    title: "Bali Tropical Serenity & Spiritual Highlands",
    summary:
      "A harmonious blend of lush jungle sanctuaries in Ubud, majestic cliffside ocean temples in Uluwatu, vibrant beach clubs, and serene sunrise terraces.",
    days: [
      {
        day: 1,
        theme: "Cultural Heart of Ubud & Sacred Monkey Forest",
        activities: [
          {
            time: "10:00 AM",
            activity: "Explore Sacred Monkey Forest Sanctuary",
            location: "Padangtegal, Ubud",
            coordinates: { latitude: -8.5188, longitude: 115.2582 },
            notes: "Wander through ancient banyan trees and observe Balinese macaques.",
          },
          {
            time: "02:00 PM",
            activity: "Visit Ubud Royal Palace & Art Market",
            location: "Jl. Raya Ubud",
            coordinates: { latitude: -8.5069, longitude: 115.2625 },
            notes: "Traditional Balinese architecture and handmade rattan bags.",
          },
          {
            time: "05:00 PM",
            activity: "Campuhan Ridge Walk at Golden Hour",
            location: "Campuhan Valley",
            coordinates: { latitude: -8.5034, longitude: 115.2536 },
            notes: "Breathtaking hillside trek overlooking lush river valleys.",
          },
        ],
        meals: [
          {
            type: "breakfast",
            suggestion: "Dragonfruit smoothie bowl and Balinese Kopi",
            restaurant: "Alchemy Bali",
          },
          {
            type: "lunch",
            suggestion: "Authentic Nasi Campur with Sate Lilit and Sambal Matah",
            restaurant: "Warung Babi Guling Ibu Oka",
          },
          {
            type: "dinner",
            suggestion: "Crispy Duck (Bebek Bengil) overlooking lotus ponds",
            restaurant: "Bebek Bengil Dirty Duck Diner",
          },
        ],
        accommodation: "Maya Ubud Resort & Spa",
      },
      {
        day: 2,
        theme: "Tegalalang Rice Terraces & Tirta Empul Holy Springs",
        activities: [
          {
            time: "08:00 AM",
            activity: "Sunrise hike through Tegalalang Rice Terraces",
            location: "Tegalalang, Gianyar",
            coordinates: { latitude: -8.4334, longitude: 115.2811 },
            notes: "Iconic Subak irrigation terraces surrounded by palms.",
          },
          {
            time: "11:30 AM",
            activity: "Purification ritual at Tirta Empul Temple",
            location: "Manukaya, Tampaksiring",
            coordinates: { latitude: -8.4151, longitude: 115.3152 },
            notes: "Sacred water spring temple dating back to 962 AD.",
          },
          {
            time: "03:30 PM",
            activity: "Tibumana Hidden Waterfall Swim",
            location: "Apuan, Bangli",
            coordinates: { latitude: -8.5039, longitude: 115.3308 },
            notes: "Picturesque single-drop waterfall in a lush jungle canyon.",
          },
        ],
        meals: [
          {
            type: "breakfast",
            suggestion: "Poached eggs on sourdough with smashed avocado",
            restaurant: "Clear Cafe Ubud",
          },
          {
            type: "lunch",
            suggestion: "Gado-Gado peanut salad with Tempeh and coconut water",
            restaurant: "Terrace River Pool Cafe",
          },
          {
            type: "dinner",
            suggestion: "Balinese grilled seafood platter with jasmine rice",
            restaurant: "Locavore NXT",
          },
        ],
        accommodation: "Kamandalu Ubud",
      },
      {
        day: 3,
        theme: "Uluwatu Clifftop Temple & Sunset Kecak Dance",
        activities: [
          {
            time: "11:00 AM",
            activity: "Relax at Padang Padang & Thomas Beach",
            location: "Uluwatu Peninsula",
            coordinates: { latitude: -8.8111, longitude: 115.1039 },
            notes: "Dramatic limestone cliffs and pristine white sands.",
          },
          {
            time: "04:30 PM",
            activity: "Explore Pura Luhur Uluwatu Temple",
            location: "Pecatu, South Kuta",
            coordinates: { latitude: -8.8291, longitude: 115.0849 },
            notes: "Sea temple perched atop a sheer 70-meter cliff.",
          },
          {
            time: "06:00 PM",
            activity: "Witness Traditional Kecak Fire Dance at Sunset",
            location: "Uluwatu Amphitheater",
            coordinates: { latitude: -8.8295, longitude: 115.0851 },
            notes: "Enchanting chant performance with the sun sinking into the Indian Ocean.",
          },
        ],
        meals: [
          {
            type: "breakfast",
            suggestion: "Tropical fruit platter, granola, and matcha latte",
            restaurant: "Single Fin Uluwatu",
          },
          {
            type: "lunch",
            suggestion: "Mahi Mahi tacos with lime crema and sweet potato fries",
            restaurant: "Drifter Surf Cafe",
          },
          {
            type: "dinner",
            suggestion: "Candlelit Jimbaran Bay beachfront seafood barbecue",
            restaurant: "Menega Cafe, Jimbaran Beach",
          },
        ],
        accommodation: "Anantara Uluwatu Bali Resort",
      },
    ],
    tips: [
      "Wear a sarong and sash when entering sacred Hindu temples (usually provided at entrance).",
      "Keep loose items, sunglasses, and phones secured around temple monkeys.",
      "Use Grab or Gojek apps for transparent ride-hailing fares.",
      "Drink only bottled or filtered water.",
    ],
    packingChecklist: [
      "Breathable linen clothing",
      "Modest temple wrap / sarong",
      "Reef-safe sunscreen",
      "Universal travel adapter",
    ],
  },

  bandarban: {
    title: "Bandarban Clouds & High Peaks Expedition",
    summary:
      "Journey above the clouds to the misty heights of Nilgiri, the serene waters of volcanic Boga Lake, and the golden Buddhist sanctuaries of the Chittagong Hill Tracts.",
    days: [
      {
        day: 1,
        theme: "Arrival, Meghla Lake & Golden Temple",
        activities: [
          {
            time: "10:30 AM",
            activity: "Arrival in Bandarban town & Chander Gari registration",
            location: "Bandarban Sadar",
            coordinates: { latitude: 22.1953, longitude: 92.2184 },
            notes: "Register with the local tourist police office before heading into the hills.",
          },
          {
            time: "02:30 PM",
            activity: "Explore Buddha Dhatu Jadi (Golden Temple)",
            location: "Balaghata, Bandarban",
            coordinates: { latitude: 22.2167, longitude: 92.2167 },
            notes: "Perched atop a hill; sacred Theravada Buddhist temple with the second largest Buddha statue in Bangladesh.",
          },
          {
            time: "05:00 PM",
            activity: "Cable car & suspension bridge at Meghla Eco Resort",
            location: "Meghla Tourist Complex",
            coordinates: { latitude: 22.1812, longitude: 92.1952 },
            notes: "Scenic lake nestled between forested hills with picturesque footbridges.",
          },
        ],
        meals: [
          {
            type: "breakfast",
            suggestion: "Paratha, spicy chana dal, and hot ginger milk tea",
            restaurant: "Green Valley Restora",
          },
          {
            type: "lunch",
            suggestion: "Bamboo Shoot Chicken Curry with sticky Jhum rice",
            restaurant: "Hill View Cafe",
          },
          {
            type: "dinner",
            suggestion: "Spiced Tribal Duck Curry with mashed potato vorta",
            restaurant: "Bawm Tribal Kitchen",
          },
        ],
        accommodation: "Hotel Hill View / Sairu Hill Resort",
      },
      {
        day: 2,
        theme: "Nilgiri Cloud Haven & Chimbuk High Peaks",
        activities: [
          {
            time: "07:00 AM",
            activity: "Morning 4WD safari to Nilgiri Cloud Resort",
            location: "Nilgiri Peak",
            coordinates: { latitude: 21.8677, longitude: 92.3486 },
            notes: "Perched 2,400 feet above sea level; clouds float right across the balcony.",
          },
          {
            time: "01:30 PM",
            activity: "Climb Chimbuk Hill & visit Murong Tribal Village",
            location: "Chimbuk Hill Range",
            coordinates: { latitude: 21.9961, longitude: 92.2982 },
            notes: "The 'Crown of Bengal'; meet hospitable indigenous weaving artisans.",
          },
          {
            time: "04:30 PM",
            activity: "Refresh at Shoilo Propat Waterfall",
            location: "Shoilo Propat, Thanchi Road",
            coordinates: { latitude: 22.1465, longitude: 92.2412 },
            notes: "Cascading cold mountain spring stream with handmade wooden craft stalls.",
          },
        ],
        meals: [
          {
            type: "breakfast",
            suggestion: "Hot Khichuri with omelette and mountain honey tea",
            restaurant: "Nilgiri Sky Restaurant",
          },
          {
            type: "lunch",
            suggestion: "Grilled mountain river fish and boiled wild fern salad",
            restaurant: "Chimbuk Road Dhabba",
          },
          {
            type: "dinner",
            suggestion: "Barbecue chicken skewer with Naan under starry skies",
            restaurant: "Sairu Open Deck Bistro",
          },
        ],
        accommodation: "Sairu Hill Resort, Y-Junction",
      },
      {
        day: 3,
        theme: "Boga Lake Scenic Trek & Tribal Markets",
        activities: [
          {
            time: "08:30 AM",
            activity: "Drive along Sangu River to Ruma Bazar",
            location: "Sangu River Basin",
            coordinates: { latitude: 22.0465, longitude: 92.4112 },
            notes: "Crystal emerald waters bordered by steep limestone crags.",
          },
          {
            time: "12:00 PM",
            activity: "Trek to mystical volcanic Boga Lake",
            location: "Boga Lake, Ruma",
            coordinates: { latitude: 21.9833, longitude: 92.4833 },
            notes: "High mountain crater lake 1,200 ft high with fascinating indigenous legends.",
          },
          {
            time: "04:30 PM",
            activity: "Shop at Marma Handloom Market",
            location: "Bandarban Tribal Bazaar",
            coordinates: { latitude: 22.1932, longitude: 92.2215 },
            notes: "Handmade waistcoats, cane baskets, pure hill honey, and herbal teas.",
          },
        ],
        meals: [
          {
            type: "breakfast",
            suggestion: "Fresh hot roti with egg bhurji and lemongrass tea",
            restaurant: "Ruma Bazar Tea Stall",
          },
          {
            type: "lunch",
            suggestion: "Bawm traditional chicken cooked in fresh bamboo stem",
            restaurant: "Boga Lake Eco Restora",
          },
          {
            type: "dinner",
            suggestion: "Tandoori chicken with garlic naan and mint chutney",
            restaurant: "Milanchari Rock Diner",
          },
        ],
        accommodation: "Venus Resort / Hill View Bandarban",
      },
    ],
    tips: [
      "Foreign tourists require prior permit from the Deputy Commissioner office in Bandarban.",
      "Bring cash as hill stations have very few ATMs.",
      "Hire experienced 4WD drivers for steep mountain hairpin turns.",
    ],
    packingChecklist: [
      "Sturdy hiking boots with strong grip",
      "Light jacket / fleece for cool hill evenings",
      "Personal ID photocopies for military checkpoints",
      "Torchlight / headlamp for remote areas",
    ],
  },

  dhaka: {
    title: "Dhaka Historic Heritage & Culinary Odyssey",
    summary:
      "Uncover 400 years of Mughal majesty in Old Dhaka, colonial waterfront trading hubs along Buriganga, iconic modernist architecture, and world-famed Kacchi Biryani.",
    days: [
      {
        day: 1,
        theme: "Mughal Majesty & Historic Old Dhaka",
        activities: [
          {
            time: "09:30 AM",
            activity: "Tour Lalbagh Fort & Tomb of Pari Bibi",
            location: "Lalbagh, Old Dhaka",
            coordinates: { latitude: 23.7196, longitude: 90.3882 },
            notes: "17th-century Mughal fortress complex built by Prince Muhammad Azam.",
          },
          {
            time: "12:30 PM",
            activity: "Visit Ahsan Manzil (The Pink Palace)",
            location: "Kumartoli, Sadarghat",
            coordinates: { latitude: 23.7086, longitude: 90.4061 },
            notes: "Official palace of the Nawabs of Dhaka overlooking the Buriganga River.",
          },
          {
            time: "03:30 PM",
            activity: "Rickshaw ride through Shankhari Bazaar craft alley",
            location: "Shankhari Bazaar",
            coordinates: { latitude: 23.7121, longitude: 90.4102 },
            notes: "Centuries-old conch shell carvers and vibrant spice merchants.",
          },
          {
            time: "05:30 PM",
            activity: "Wooden boat ride on the Buriganga River",
            location: "Sadarghat Terminal",
            coordinates: { latitude: 23.7056, longitude: 90.4095 },
            notes: "Witness the bustling heartbeat of one of the world's largest river ports.",
          },
        ],
        meals: [
          {
            type: "breakfast",
            suggestion: "Dhaka Bakarkhani with Nihari and hot Malai Cha",
            restaurant: "Beauty Lassi & Faluda",
          },
          {
            type: "lunch",
            suggestion: "Original Mutton Kacchi Biryani with Borhani and Shahi Firni",
            dishName: "Old Dhaka Kacchi Biryani",
            restaurant: "Grand Nawab / Haji Biryani, Nazira Bazar",
          },
          {
            type: "dinner",
            suggestion: "Mutton Leg Roast, Sheekh Kabab, and buttery Roomali Roti",
            restaurant: "Star Kabab & Restaurant",
          },
        ],
        accommodation: "InterContinental Dhaka / Pan Pacific Sonargaon",
      },
      {
        day: 2,
        theme: "Art, Knowledge & Modernist Architecture",
        activities: [
          {
            time: "09:30 AM",
            activity: "Explore Louis Kahn's National Parliament Building",
            location: "Sher-e-Bangla Nagar",
            coordinates: { latitude: 23.7625, longitude: 90.3786 },
            notes: "Architectural masterpiece combining monumental concrete with serene water reflections.",
          },
          {
            time: "01:30 PM",
            activity: "Dhaka University historic campus & Curzon Hall",
            location: "Curzon Hall, DU",
            coordinates: { latitude: 23.7272, longitude: 90.4014 },
            notes: "Stunning Indo-Saracenic colonial red brick architecture built in 1904.",
          },
          {
            time: "04:30 PM",
            activity: "Stroll along Dhanmondi Lake & Rabindra Sarobar",
            location: "Dhanmondi Lake",
            coordinates: { latitude: 23.7461, longitude: 90.3753 },
            notes: "Lively artistic open amphitheater with street musicians and tea stalls.",
          },
        ],
        meals: [
          {
            type: "breakfast",
            suggestion: "Piping hot Kochuri with spicy Aloor Dum and Jilapi",
            restaurant: "Al Razzaq Restaurant",
          },
          {
            type: "lunch",
            suggestion: "Traditional 30-item Bhorta & Fish Thali with Kalijeera rice",
            restaurant: "Kasturi, Purana Paltan",
          },
          {
            type: "dinner",
            suggestion: "Grilled Hilsa Mustard & Chingri Malai Curry",
            restaurant: "Bhooter Bari / Handi Dhanmondi",
          },
        ],
        accommodation: "Amari Dhaka / The Westin Dhaka",
      },
      {
        day: 3,
        theme: "Handloom Heritage & Craft Shopping",
        activities: [
          {
            time: "10:00 AM",
            activity: "Visit Jamdani Weaving Village in Demra",
            location: "Demra Jamdani Palli",
            coordinates: { latitude: 23.7248, longitude: 90.4952 },
            notes: "UNESCO Intangible Cultural Heritage; observe artisans weaving gold-thread muslin sarees.",
          },
          {
            time: "02:30 PM",
            activity: "Aarong Flagship Store handicrafts shopping",
            location: "Aarong, Tejgaon",
            coordinates: { latitude: 23.7698, longitude: 90.4012 },
            notes: "Finest Nakshi Kantha quilts, terracotta art, brass ornaments, and silk.",
          },
          {
            time: "06:00 PM",
            activity: "Hatirjheel waterfront illuminated water taxi ride",
            location: "Hatirjheel Promenade",
            coordinates: { latitude: 23.7682, longitude: 90.4125 },
            notes: "Relaxing evening boat cruise amidst glowing city bridges.",
          },
        ],
        meals: [
          {
            type: "breakfast",
            suggestion: "Artisan sourdough, poached eggs, and flat white",
            restaurant: "North End Coffee Roasters",
          },
          {
            type: "lunch",
            suggestion: "Morog Polao with boiled egg, cucumber salad, and Borhani",
            restaurant: "Nanna Biryani, Becharam Dewri",
          },
          {
            type: "dinner",
            suggestion: "Pan-Asian rooftop dining overlooking the city skyline",
            restaurant: "The Sky Room Dining, Gulshan",
          },
        ],
        accommodation: "Sheraton Dhaka, Banani",
      },
    ],
    tips: [
      "Use Dhaka Metro Rail (MRT Line 6) to bypass road traffic between Mirpur, Farmgate, and Motijheel.",
      "Always negotiate cycle-rickshaw fares politely before boarding in Old Dhaka.",
      "Visit Lalbagh Fort and Ahsan Manzil early in the morning to beat the afternoon heat.",
    ],
    packingChecklist: [
      "Light, modest clothing suitable for historic and religious monuments",
      "Comfortable slip-on shoes for temple and mosque visits",
      "Hand sanitizer and wet wipes for street food adventures",
    ],
  },

  tokyo: {
    title: "Tokyo Neon Horizons & Ancient Shinto Sanctuaries",
    summary:
      "A thrilling encounter between centuries-old Shinto traditions, futuristic sensory wonders in Shibuya & Akihabara, and Michelin-caliber gastronomic brilliance.",
    days: [
      {
        day: 1,
        theme: "Historic Asakusa & Futuristic Sky View",
        activities: [
          {
            time: "09:00 AM",
            activity: "Explore Senso-ji Temple & Nakamise-dori",
            location: "Asakusa, Taito",
            coordinates: { latitude: 35.7148, longitude: 139.7967 },
            notes: "Tokyo's oldest Buddhist temple founded in 645 AD. Sample freshly grilled rice crackers.",
          },
          {
            time: "01:30 PM",
            activity: "Scenic Sumida River Cruise to Hamarikyu Gardens",
            location: "Asakusa Pier",
            coordinates: { latitude: 35.7118, longitude: 139.7992 },
            notes: "Cruise aboard the futuristic water bus designed by anime icon Leiji Matsumoto.",
          },
          {
            time: "05:00 PM",
            activity: "Tokyo Skytree 360-degree Sunset Panorama",
            location: "Oshiage, Sumida",
            coordinates: { latitude: 35.7101, longitude: 139.8107 },
            notes: "View Mount Fuji on clear evenings from 450 meters above the metropolis.",
          },
        ],
        meals: [
          {
            type: "breakfast",
            suggestion: "Tamagoyaki rolled omelette and matcha tea",
            restaurant: "Asakusa Kagetsudo",
          },
          {
            type: "lunch",
            suggestion: "Edomae Tempura over steamed rice with miso broth",
            restaurant: "Daikokuya Tempura, Asakusa",
          },
          {
            type: "dinner",
            suggestion: "Wagyu beef Sukiyaki hot pot with raw egg dip",
            restaurant: "Asakusa Imahan",
          },
        ],
        accommodation: "The Gate Hotel Asakusa Kaminarimon",
      },
      {
        day: 2,
        theme: "Meiji Shrine, Harajuku & Shibuya Crossing",
        activities: [
          {
            time: "08:30 AM",
            activity: "Walk through tranquil Meiji Jingu Forest",
            location: "Yoyogikamizonocho, Shibuya",
            coordinates: { latitude: 35.6764, longitude: 139.6993 },
            notes: "Serene sacred Shinto forest with towering wooden Torii gates in the center of Tokyo.",
          },
          {
            time: "11:30 AM",
            activity: "Takeshita Street & Omotesando architecture walk",
            location: "Harajuku, Shibuya",
            coordinates: { latitude: 35.6702, longitude: 139.7027 },
            notes: "Epicenter of youth fashion, designer boutiques, and decadent Japanese crepes.",
          },
          {
            time: "04:30 PM",
            activity: "Experience Shibuya Scramble Crossing & Shibuya Sky",
            location: "Shibuya Station, Tokyo",
            coordinates: { latitude: 35.6595, longitude: 139.7004 },
            notes: "The world's busiest pedestrian crossing, followed by open-air rooftop observatory views.",
          },
        ],
        meals: [
          {
            type: "breakfast",
            suggestion: "Fluffy Japanese Souffle Pancakes with fresh berries",
            restaurant: "A Happy Pancake, Omotesando",
          },
          {
            type: "lunch",
            suggestion: "Handcrafted Tonkotsu Ramen with marinated soft-boiled egg",
            restaurant: "Ichiran Shibuya",
          },
          {
            type: "dinner",
            suggestion: "Yakitori chicken skewers and cold draft beer in Omoide Yokocho",
            restaurant: "Memory Lane (Omoide Yokocho), Shinjuku",
          },
        ],
        accommodation: "Cerulean Tower Tokyu Hotel, Shibuya",
      },
      {
        day: 3,
        theme: "Tsukiji Outer Market & Digital Art Wonders",
        activities: [
          {
            time: "08:00 AM",
            activity: "Street food breakfast at Tsukiji Outer Market",
            location: "Tsukiji, Chuo",
            coordinates: { latitude: 35.6655, longitude: 139.7707 },
            notes: "Sample fresh uni, blowtorched wagyu skewers, and sweet egg omelettes.",
          },
          {
            time: "11:30 AM",
            activity: "Immerse in teamLab Planets Digital Art Museum",
            location: "Toyosu, Koto",
            coordinates: { latitude: 35.6517, longitude: 139.7908 },
            notes: "Walk through water and body-immersive glowing digital flower universes.",
          },
          {
            time: "03:30 PM",
            activity: "Akihabara Electric Town & Retro Gaming",
            location: "Sotokanda, Chiyoda",
            coordinates: { latitude: 35.6984, longitude: 139.7731 },
            notes: "Multi-story arcade hubs, vintage gaming emporiums, and anime collectibles.",
          },
        ],
        meals: [
          {
            type: "breakfast",
            suggestion: "Fresh Otoro Bluefin Tuna Sashimi bowl (Kaisen-don)",
            restaurant: "Tsukiji Donburi Senka",
          },
          {
            type: "lunch",
            suggestion: "Crispy Tonkatsu pork cutlet with shredded cabbage and sesame sauce",
            restaurant: "Tonkatsu Maisen Aoyama",
          },
          {
            type: "dinner",
            suggestion: "Omakase Chef Sushi tasting menu",
            restaurant: "Sushi Zanmai Okunoin, Tsukiji",
          },
        ],
        accommodation: "Park Hyatt Tokyo / Hotel Gracery Shinjuku",
      },
    ],
    tips: [
      "Purchase a Welcome Suica or Pasmo IC card for tap-and-go metro and convenience store payments.",
      "Tokyo trains stop running around midnight; plan evening commutes accordingly.",
      "Bow slightly when thanking service staff; tipping is not customary in Japan.",
    ],
    packingChecklist: [
      "Comfortable slip-on walking shoes (frequent shoe removal at temples/ryokans)",
      "Pocket Wi-Fi device or Japan eSIM",
      "Coin purse for 100 & 500 yen coins",
    ],
  },

  paris: {
    title: "Paris Classical Romance, Masterpieces & Seine Vistas",
    summary:
      "Stroll the grand boulevards of the City of Light, marvel at the Mona Lisa in the Louvre, savor golden buttery pastries in Saint-Germain, and watch the Eiffel Tower sparkle across the Seine.",
    days: [
      {
        day: 1,
        theme: "Eiffel Tower, Champ de Mars & River Cruise",
        activities: [
          {
            time: "10:00 AM",
            activity: "Ascend the Eiffel Tower summit",
            location: "Champ de Mars, 7th Arr.",
            coordinates: { latitude: 48.8584, longitude: 2.2945 },
            notes: "Pre-book summit elevator tickets to skip hours of queues.",
          },
          {
            time: "02:30 PM",
            activity: "Stroll along the historic Champs-Élysées & Arc de Triomphe",
            location: "Place Charles de Gaulle",
            coordinates: { latitude: 48.8738, longitude: 2.2950 },
            notes: "Climb to the top of the Arc for panoramic avenues radiating in a star pattern.",
          },
          {
            time: "07:30 PM",
            activity: "Illuminated Seine River Bateaux Parisiens Dinner Cruise",
            location: "Port de la Bourdonnais",
            coordinates: { latitude: 48.8601, longitude: 2.2982 },
            notes: "Watch the Eiffel Tower sparkle on the hour while gliding past Notre-Dame.",
          },
        ],
        meals: [
          {
            type: "breakfast",
            suggestion: "Warm butter croissant, pain au chocolat, and café crème",
            restaurant: "Café de Flore, Saint-Germain",
          },
          {
            type: "lunch",
            suggestion: "Classic Croque Monsieur with Emmental cheese and Dijon mustard",
            restaurant: "Le Recrutement Café",
          },
          {
            type: "dinner",
            suggestion: "Duck Confit with roasted rosemary potatoes and red Bordeaux",
            restaurant: "Bistrot Paul Bert",
          },
        ],
        accommodation: "Hôtel Plaza Athénée / Pullman Paris Tour Eiffel",
      },
      {
        day: 2,
        theme: "The Louvre, Tuileries & Palais Garnier",
        activities: [
          {
            time: "09:00 AM",
            activity: "Guided tour of the Musée du Louvre",
            location: "Rue de Rivoli, 1st Arr.",
            coordinates: { latitude: 48.8606, longitude: 2.3376 },
            notes: "See the Mona Lisa, Venus de Milo, and Winged Victory of Samothrace.",
          },
          {
            time: "01:00 PM",
            activity: "Walk through Jardin des Tuileries & Place de la Concorde",
            location: "Tuileries Garden",
            coordinates: { latitude: 48.8634, longitude: 2.3275 },
            notes: "Sit in the iconic green metal chairs by the grand central fountain.",
          },
          {
            time: "04:00 PM",
            activity: "Admire opulent gilded architecture at Palais Garnier Opera",
            location: "Place de l'Opéra",
            coordinates: { latitude: 48.8719, longitude: 2.3316 },
            notes: "Inspiration for 'The Phantom of the Opera' with Chagall's ceiling painting.",
          },
        ],
        meals: [
          {
            type: "breakfast",
            suggestion: "Brioche French toast with Chantilly cream and double espresso",
            restaurant: "Angelina Paris (Famous for African Hot Chocolate)",
          },
          {
            type: "lunch",
            suggestion: "French Onion Soup gratinated with Gruyère cheese",
            restaurant: "Le Comptoir du Relais",
          },
          {
            type: "dinner",
            suggestion: "Steak Frites with secret herb butter sauce and green salad",
            restaurant: "Le Relais de Venise L'Entrecôte",
          },
        ],
        accommodation: "Grand Hôtel du Palais Royal",
      },
      {
        day: 3,
        theme: "Montmartre Artists Quarter & Sacré-Cœur",
        activities: [
          {
            time: "09:30 AM",
            activity: "Explore Bohemian Montmartre & Place du Tertre",
            location: "Montmartre, 18th Arr.",
            coordinates: { latitude: 48.8867, longitude: 2.3408 },
            notes: "Historic stomping ground of Picasso and Van Gogh; have your portrait sketched.",
          },
          {
            time: "12:00 PM",
            activity: "Visit the Basilica of the Sacré-Cœur",
            location: "Parvis du Sacré-Cœur",
            coordinates: { latitude: 48.8867, longitude: 2.3431 },
            notes: "Gleaming white travertine basilica perched on Paris's highest hilltop.",
          },
          {
            time: "04:00 PM",
            activity: "Wander Shakespeare & Company and the Latin Quarter",
            location: "Rue de la Bûcherie, 5th Arr.",
            coordinates: { latitude: 48.8525, longitude: 2.3471 },
            notes: "Legendary English bookstore frequented by Hemingway and James Joyce.",
          },
        ],
        meals: [
          {
            type: "breakfast",
            suggestion: "Traditional baguette with artisan butter and apricot preserves",
            restaurant: "Le Grenier à Pain, Abbesses",
          },
          {
            type: "lunch",
            suggestion: "Savory Galette with ham, egg, and Gruyère from Brittany",
            restaurant: "Breizh Café, Le Marais",
          },
          {
            type: "dinner",
            suggestion: "Boeuf Bourguignon slow-cooked in Pinot Noir with pearl onions",
            restaurant: "Chez René, Boulevard Saint-Germain",
          },
        ],
        accommodation: "Hôtel Monge, Latin Quarter",
      },
    ],
    tips: [
      "Beware of pickpockets on metro lines 1 and 4 and near major tourist monuments.",
      "Always greet shopkeepers with a friendly 'Bonjour Madame/Monsieur' when entering.",
      "Most museums are closed on Mondays or Tuesdays; verify dates before visiting.",
    ],
    packingChecklist: [
      "Chic, comfortable walking loafers or leather sneakers",
      "Compact umbrella (frequent Parisian passing showers)",
      "Crossbody anti-theft bag",
    ],
  },

  bangkok: {
    title: "Bangkok Golden Spires, River Markets & Vibrant Streets",
    summary:
      "Marvel at the glittering Grand Palace, navigate lively longtail boats through khlong canals, savor legendary Michelin-star street food, and gaze over glittering city skylines from rooftop terraces.",
    days: [
      {
        day: 1,
        theme: "The Grand Palace, Wat Pho & Riverside Magic",
        activities: [
          {
            time: "08:30 AM",
            activity: "Tour the Grand Palace & Wat Phra Kaew",
            location: "Na Phra Lan Rd, Phra Borom Maha Ratchawang",
            coordinates: { latitude: 13.7500, longitude: 100.4914 },
            notes: "Revered Emerald Buddha carved from a single piece of jade; strict dress code applies.",
          },
          {
            time: "11:30 AM",
            activity: "Explore Wat Pho (Temple of the Reclining Buddha)",
            location: "Sanam Chai Rd, Phra Nakhon",
            coordinates: { latitude: 13.7465, longitude: 100.4933 },
            notes: "46-meter gold-leaf reclining Buddha with mother-of-pearl inscribed soles.",
          },
          {
            time: "04:30 PM",
            activity: "Cross river by ferry to Wat Arun (Temple of Dawn) at Sunset",
            location: "Bangkok Yai, Thonburi",
            coordinates: { latitude: 13.7437, longitude: 100.4889 },
            notes: "Soaring 80-meter Khmer-style prang encrusted with colorful porcelain pieces.",
          },
        ],
        meals: [
          {
            type: "breakfast",
            suggestion: "Jok (Thai pork rice congee with poached egg and crispy noodles)",
            restaurant: "Jok Prince, Bang Rak",
          },
          {
            type: "lunch",
            suggestion: "Pad Thai with giant river prawns wrapped in an egg net",
            restaurant: "Thip Samai Pad Thai",
          },
          {
            type: "dinner",
            suggestion: "Royal Thai Massaman Beef Curry and fragrant jasmine rice",
            restaurant: "The Deck by The River (Spectacular Wat Arun view)",
          },
        ],
        accommodation: "Mandarin Oriental Bangkok / The Peninsula",
      },
      {
        day: 2,
        theme: "Canal Boat Safari & Mega Malls at IconSiam",
        activities: [
          {
            time: "09:00 AM",
            activity: "Longtail wooden boat safari along Thonburi Khlongs",
            location: "Tha Tien Pier",
            coordinates: { latitude: 13.7444, longitude: 100.4906 },
            notes: "Experience traditional stilt houses, floating water orchids, and monitor lizards.",
          },
          {
            time: "01:30 PM",
            activity: "Explore IconSiam & SookSiam Indoor Floating Market",
            location: "Charoen Nakhon Rd, Khlong San",
            coordinates: { latitude: 13.7267, longitude: 100.5108 },
            notes: "Spectacular multi-floor cultural hub featuring crafts and delicacies from Thailand's 77 provinces.",
          },
          {
            time: "06:30 PM",
            activity: "Chao Phraya River Luxury Dinner Cruise",
            location: "River City Pier",
            coordinates: { latitude: 13.7297, longitude: 100.5139 },
            notes: "Live traditional saxophone music and illuminated bridges.",
          },
        ],
        meals: [
          {
            type: "breakfast",
            suggestion: "Khao Tom (fragrant fish broth with fresh celery and garlic)",
            restaurant: "Riverside Terrace Cafe",
          },
          {
            type: "lunch",
            suggestion: "Khao Soi creamy coconut curry noodles with crispy shallots",
            restaurant: "SookSiam Market Pavilion",
          },
          {
            type: "dinner",
            suggestion: "Grilled jumbo river prawns and spicy Tom Yum Goong",
            restaurant: "Supanniga Eating Room",
          },
        ],
        accommodation: "Shangri-La Bangkok / Lebua at State Tower",
      },
      {
        day: 3,
        theme: "Chatuchak Market & Yaowarat Chinatown Street Food",
        activities: [
          {
            time: "10:00 AM",
            activity: "Shop at Chatuchak Weekend Market / Jim Thompson House",
            location: "Kamphaeng Phet 2 Rd, Chatuchak",
            coordinates: { latitude: 13.7999, longitude: 100.5505 },
            notes: "Over 15,000 stalls featuring Thai silk, ceramics, vintage fashion, and spices.",
          },
          {
            time: "03:30 PM",
            activity: "Traditional 2-hour Thai massage and herbal compress",
            location: "Wat Pho Traditional Massage School",
            coordinates: { latitude: 13.7468, longitude: 100.4925 },
            notes: "Birthplace of authentic ancient Thai healing techniques.",
          },
          {
            time: "06:30 PM",
            activity: "Yaowarat Chinatown Street Food Safari & Sky Bar",
            location: "Yaowarat Rd, Samphanthawong",
            coordinates: { latitude: 13.7410, longitude: 100.5085 },
            notes: "Sizzling woks under glowing red neon signs, followed by cocktails at Sky Bar at Lebua.",
          },
        ],
        meals: [
          {
            type: "breakfast",
            suggestion: "Fresh coconut ice cream served in a coconut shell with peanuts",
            restaurant: "Chatuchak Market Food Stalls",
          },
          {
            type: "lunch",
            suggestion: "Som Tum spicy green papaya salad with sticky rice and grilled chicken",
            restaurant: "Somtum Der, Silom",
          },
          {
            type: "dinner",
            suggestion: "Crispy oyster omelette (Hoy Tod) and Sweet Mango with Sticky Rice",
            restaurant: "Nai Ek Roll Noodles & Yaowarat Street Vendors",
          },
        ],
        accommodation: "Banyan Tree Bangkok (Home to Vertigo Rooftop)",
      },
    ],
    tips: [
      "Wear clothes covering shoulders and knees when visiting temples; sarongs can be bought at the gate.",
      "Insist taxis use the meter ('meter na khrap/kha') or use Grab/Bolt for guaranteed transparent fares.",
      "Stay hydrated in Bangkok's tropical climate with fresh chilled coconut water.",
    ],
    packingChecklist: [
      "Lightweight, loose-fitting cotton or linen clothing",
      "Slip-on shoes for frequent temple entry",
      "Electrolyte drink powder sachets",
      "Compact handheld portable fan",
    ],
  },
};

/**
 * Dynamically builds a rich, fully populated fallback itinerary for any destination.
 */
function buildDynamicFallback(request: TripPlannerEngineRequest): TripPlan {
  const dest = request.destination || "Wonderland";
  const daysCount = Math.min(Math.max(request.durationDays || 3, 1), 14);
  const currency = request.currency || "USD";
  const budget = request.totalBudget || (currency === "BDT" ? 35000 : 1200);

  const budgetBreakdown = calculateBudgetDistribution(
    budget,
    currency,
    daysCount,
    request.travelers || 1,
    request.travelStyle
  );

  const generatedDays: TripDay[] = [];

  for (let i = 1; i <= daysCount; i++) {
    const isFirst = i === 1;
    const isLast = i === daysCount;

    let theme = `${dest} Signature Highlights & Landmarks`;
    if (isFirst) theme = `Arrival, Check-in & First Impressions of ${dest}`;
    else if (isLast) theme = `Farewell Delights, Scenic Vistas & Souvenir Hunting`;
    else if (i % 2 === 0) theme = `Cultural Heritage, Art & Historic Districts`;
    else theme = `Scenic Nature, Local Markets & Hidden Neighborhoods`;

    generatedDays.push({
      day: i,
      theme,
      description: `Carefully optimized schedule balancing top sights with leisurely dining in ${dest}.`,
      activities: [
        {
          time: "09:30 AM",
          activity: isFirst
            ? `Arrive in ${dest}, hotel check-in & neighborhood orientation`
            : `Morning walking exploration of ${dest}'s historical center`,
          location: `${dest} Central Quarter`,
          coordinates: { latitude: 23.8103 + i * 0.015, longitude: 90.4125 + i * 0.015 },
          notes: "Comfortable pace; great photo opportunities.",
          estimatedCost: Math.round(budgetBreakdown.activities.estimated / daysCount / 2),
        },
        {
          time: "02:00 PM",
          activity: `Guided visit to ${dest}'s most renowned museum & botanical garden`,
          location: `${dest} Cultural Landmark`,
          coordinates: { latitude: 23.8203 + i * 0.012, longitude: 90.4225 + i * 0.012 },
          notes: "Includes skip-the-line admission and audio guide.",
          estimatedCost: Math.round(budgetBreakdown.activities.estimated / daysCount / 2),
        },
        {
          time: "06:00 PM",
          activity: `Golden hour sunset observation deck & waterfront promenade walk`,
          location: `${dest} Scenic Lookout`,
          coordinates: { latitude: 23.8303 + i * 0.008, longitude: 90.4325 + i * 0.008 },
          notes: "Unwind with panoramic views of the city skyline.",
          estimatedCost: 0,
        },
      ],
      meals: [
        {
          type: "breakfast",
          suggestion: `Traditional ${dest} breakfast with fresh local bakery & specialty coffee`,
          restaurant: `${dest} Old Town Bakery`,
          estimatedCost: Math.round(budgetBreakdown.food.estimated / daysCount * 0.25),
        },
        {
          type: "lunch",
          suggestion: `Authentic regional platter featuring chef-recommended seasonal specialties`,
          restaurant: `Bistro de ${dest}`,
          estimatedCost: Math.round(budgetBreakdown.food.estimated / daysCount * 0.4),
        },
        {
          type: "dinner",
          suggestion: `Signature gourmet dinner with local pairing and dessert`,
          restaurant: `${dest} Waterfront Dining`,
          estimatedCost: Math.round(budgetBreakdown.food.estimated / daysCount * 0.35),
        },
      ],
      accommodation: `Centrally Located Boutique Hotel, ${dest}`,
      dailyCost: Math.round(budget / daysCount),
    });
  }

  return {
    id: `fallback-${Date.now()}`,
    title: `${dest} Curated ${daysCount}-Day ${request.travelStyle.toUpperCase()} Experience`,
    summary: `A hand-crafted, high-fidelity itinerary for ${dest}. Optimized with balanced pacing, authentic dining suggestions, and 40/30/20/10 budget distribution.`,
    destination: dest,
    origin: request.origin || "Origin",
    durationDays: daysCount,
    travelStyle: request.travelStyle,
    budgetLevel: request.budgetLevel,
    currency,
    totalEstimatedCost: budget,
    estimatedCost: `${currency === "BDT" ? "৳" : "$"}${budget.toLocaleString()}`,
    budget: budgetBreakdown,
    days: generatedDays,
    tips: [
      `Keep local currency on hand for small vendors and transit tickets in ${dest}.`,
      "Download offline Google Maps of the area before setting out.",
      "Check local monument opening hours and holiday schedules.",
      "Reserve high-demand restaurant tables at least 24 hours in advance.",
    ],
    packingChecklist: [
      "Comfortable walking footwear",
      "Universal power adapter & power bank",
      "Weather-appropriate clothing",
      "Essential personal medications",
    ],
    isFallback: true,
    providerUsed: "curated_fallback",
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Primary Fallback Resolver: checks curated database, otherwise generates dynamic high-fidelity itinerary.
 */
export function getCuratedFallbackItinerary(
  request: TripPlannerEngineRequest
): TripPlan {
  const destKey = (request.destination || "").trim().toLowerCase();

  for (const [key, template] of Object.entries(CURATED_ITINERARIES)) {
    if (destKey.includes(key) || key.includes(destKey)) {
      const daysCount = Math.min(Math.max(request.durationDays || 3, 1), 14);
      const currency = request.currency || "USD";
      const budget = request.totalBudget || (currency === "BDT" ? 35000 : 1200);

      const budgetBreakdown = calculateBudgetDistribution(
        budget,
        currency,
        daysCount,
        request.travelers || 1,
        request.travelStyle
      );

      // Repeat or slice days to match duration
      const days: TripDay[] = [];
      for (let i = 0; i < daysCount; i++) {
        const templateDay = template.days[i % template.days.length];
        days.push({
          ...templateDay,
          day: i + 1,
          dailyCost: Math.round(budget / daysCount),
        });
      }

      return {
        id: `curated-${key}-${Date.now()}`,
        title: template.title,
        summary: template.summary,
        destination: request.destination,
        origin: request.origin,
        durationDays: daysCount,
        travelStyle: request.travelStyle,
        budgetLevel: request.budgetLevel,
        currency,
        totalEstimatedCost: budget,
        estimatedCost: `${currency === "BDT" ? "৳" : "$"}${budget.toLocaleString()}`,
        budget: budgetBreakdown,
        days,
        tips: template.tips,
        packingChecklist: template.packingChecklist,
        isFallback: true,
        providerUsed: "curated_fallback",
        generatedAt: new Date().toISOString(),
      };
    }
  }

  // If not in static curated list, generate dynamic fallback
  return buildDynamicFallback(request);
}
