export interface NearbyLandmark {
  name: string;
  name_bn: string;
  distance: string;
  distance_bn: string;
  icon?: string;
}

export interface CategorizedImage {
  url: string;
  category: "all" | "room" | "bathroom" | "exterior" | "dining" | "view";
  caption: string;
  caption_bn?: string;
}

export interface DetailedAmenity {
  id: string;
  name: string;
  name_bn: string;
  icon: string;
  is_free: boolean;
  fee_note?: string;
  fee_note_bn?: string;
}

export interface CatalogHotelRoom {
  id: string;
  room_type: string;
  description: string;
  max_occupancy: number;
  base_price: number;
  bed_type: string;
  square_meters: number;
  amenities: string[];
  detailed_amenities?: DetailedAmenity[];
  image_urls: string[];
  categorized_images?: CategorizedImage[];
}

export interface CatalogHotel {
  id: string;
  name: string;
  city: string;
  country: string;
  address: string;
  latitude: number;
  longitude: number;
  star_rating: number;
  average_rating: number;
  total_reviews: number;
  base_price: number;
  image_url: string;
  images: string[];
  categorized_images: CategorizedImage[];
  amenities: string[];
  detailed_amenities: DetailedAmenity[];
  nearby_landmarks: NearbyLandmark[];
  landmarks_summary_bn: string;
  landmarks_summary_en: string;
  hotel_rooms: CatalogHotelRoom[];
  daily_rates?: { [dateStr: string]: number };
  is_free_cancellation?: boolean;
}

export const FALLBACK_HOTELS: CatalogHotel[] = [
  {
    id: "hotel-cox-1",
    name: "Sea Pearl Beach Resort & Spa",
    city: "Cox's Bazar",
    country: "Bangladesh",
    address: "Jaliapalong, Inani, Cox's Bazar",
    latitude: 21.2500,
    longitude: 92.0520,
    star_rating: 5,
    average_rating: 4.8,
    total_reviews: 420,
    base_price: 8500,
    image_url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
    images: [
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800",
      "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800",
      "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800",
      "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800",
      "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800",
    ],
    categorized_images: [
      {
        url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
        category: "exterior",
        caption: "Luxury Oceanfront Resort & Palms",
        caption_bn: "রিসোর্টের বাইরের সম্মুখভাগ ও নারিকেল বাগান",
      },
      {
        url: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800",
        category: "room",
        caption: "Superior King Bedroom Suite with Balcony",
        caption_bn: "ব্যালকনিসহ সুপিরিয়র কিং বেডরুম",
      },
      {
        url: "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800",
        category: "bathroom",
        caption: "Deep Soaking Marble Bathtub & Vanity",
        caption_bn: "মার্বেল পাথরের বাথটাব ও বিলাসবহুল বাথরুম",
      },
      {
        url: "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800",
        category: "room",
        caption: "Panoramic Executive Bay View Suite",
        caption_bn: "বঙ্গোপসাগরমুখী প্যানোরামিক এক্সিকিউটিভ রুম",
      },
      {
        url: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800",
        category: "dining",
        caption: "Seafood Gourmet Buffet & Open Terrace",
        caption_bn: "সি-ফুড ও বুফে রেস্তোরাঁ টেরেস",
      },
      {
        url: "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800",
        category: "view",
        caption: "Sunset Horizons over Bay of Bengal",
        caption_bn: "ব্যালকনি থেকে সূর্যাস্তের অসাধারণ দৃশ্য",
      },
    ],
    amenities: ["Free Wi-Fi", "Swimming Pool", "Private Beach", "Breakfast Included", "Ocean View"],
    detailed_amenities: [
      { id: "wifi", name: "High-Speed Wi-Fi", name_bn: "হাই-স্পিড ওয়াই-ফাই", icon: "wifi", is_free: true, fee_note: "Complimentary throughout resort", fee_note_bn: "পুরো রিসোর্টে সম্পূর্ণ ফ্রি" },
      { id: "bf", name: "Buffet Breakfast", name_bn: "বুফে সকালের নাস্তা", icon: "restaurant", is_free: true, fee_note: "Included in room rate", fee_note_bn: "ভাড়ার সাথে ফ্রি অন্তর্ভুক্ত" },
      { id: "pool", name: "Private Infinity Pool", name_bn: "ইনফিনিটি সুইমিং পুল", icon: "water", is_free: true, fee_note: "Free guest access 7am-9pm", fee_note_bn: "অতিথিদের জন্য সম্পূর্ণ ফ্রি" },
      { id: "ac", name: "Central Climate AC", name_bn: "সেন্ট্রাল এয়ার কন্ডিশন", icon: "snow", is_free: true, fee_note: "In-room temperature control", fee_note_bn: "রুমের তাপমাত্রা নিয়ন্ত্রণ সুবিধা" },
      { id: "beach", name: "Private Sandy Beach Access", name_bn: "প্রাইভেট সমুদ্র সৈকত", icon: "sunny", is_free: true, fee_note: "Exclusive sun loungers included", fee_note_bn: "সানবেড ও ছাতাসহ সম্পূর্ণ ফ্রি" },
      { id: "shuttle", name: "Airport Pickup & Drop", name_bn: "বিমানবন্দর ট্রান্সফার", icon: "car", is_free: false, fee_note: "Extra charge ৳1,200/trip", fee_note_bn: "অতিরিক্ত চার্জ ৳১,২০০/ট্রিপ" },
      { id: "spa", name: "Ayurvedic Spa & Sauna", name_bn: "স্পা ও ম্যাসাজ থেরাপি", icon: "sparkles", is_free: false, fee_note: "Paid wellness packages", fee_note_bn: "পেইড প্যাকেজ (অতিরিক্ত চার্জ)" },
      { id: "minibar", name: "Gourmet Mini-bar", name_bn: "রুম মিনিবার ও স্ন্যাক্স", icon: "wine", is_free: false, fee_note: "Charged per consumed item", fee_note_bn: "ব্যবহার অনুযায়ী অতিরিক্ত চার্জ" },
    ],
    nearby_landmarks: [
      { name: "Inani Beach", name_bn: "ইনানী সৈকত", distance: "১০০ মি", distance_bn: "১০০ মি", icon: "water-outline" },
      { name: "Bus Stand", name_bn: "বাস স্টপ", distance: "২০০ মি", distance_bn: "২০০ মি", icon: "bus-outline" },
      { name: "Cox's Bazar Airport", name_bn: "বিমানবন্দর", distance: "২৪ কিমি", distance_bn: "২৪ কিমি", icon: "airplane-outline" },
      { name: "Inani Local Market", name_bn: "স্থানীয় বাজার", distance: "৮০০ মি", distance_bn: "৮০০ মি", icon: "cart-outline" },
    ],
    landmarks_summary_bn: "সৈকত ১০০ মি · বাস স্টপ ২০০ মি · বাজার ৮০০ মি · বিমানবন্দর ২৪ কিমি",
    landmarks_summary_en: "Beach 100m · Bus Stop 200m · Market 800m · Airport 24km",
    hotel_rooms: [
      {
        id: "room-sp-1",
        room_type: "Superior Ocean View King",
        description: "Spacious private balcony facing the Bay of Bengal with king size bed.",
        max_occupancy: 2,
        base_price: 8500,
        bed_type: "1 King Bed",
        square_meters: 42,
        amenities: ["Balcony", "AC", "Mini Bar", "Bathtub", "Free WiFi"],
        detailed_amenities: [
          { id: "wifi", name: "Free Wi-Fi", name_bn: "ফ্রি ওয়াই-ফাই", icon: "wifi", is_free: true, fee_note_bn: "ফ্রি" },
          { id: "bf", name: "Breakfast", name_bn: "সকালের নাস্তা", icon: "restaurant", is_free: true, fee_note_bn: "ফ্রি অন্তর্ভুক্ত" },
          { id: "ac", name: "Climate AC", name_bn: "এসি", icon: "snow", is_free: true, fee_note_bn: "ফ্রি" },
          { id: "minibar", name: "Mini Bar", name_bn: "মিনিবার", icon: "wine", is_free: false, fee_note_bn: "অতিরিক্ত চার্জ" },
          { id: "laundry", name: "Express Laundry", name_bn: "লন্ড্রি সার্ভিস", icon: "shirt-outline", is_free: false, fee_note_bn: "পেইড সার্ভিস" },
        ],
        image_urls: [
          "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800",
          "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800",
        ],
      },
      {
        id: "room-sp-2",
        room_type: "Executive Panoramic Suite",
        description: "Panoramic corner sea-view suite with jacuzzi and complimentary lounge access.",
        max_occupancy: 4,
        base_price: 15500,
        bed_type: "2 King Beds",
        square_meters: 75,
        amenities: ["Jacuzzi", "Living Room", "Ocean Balcony", "Breakfast", "Airport Transfer"],
        detailed_amenities: [
          { id: "wifi", name: "Free High-Speed Wi-Fi", name_bn: "ফ্রি ওয়াই-ফাই", icon: "wifi", is_free: true, fee_note_bn: "ফ্রি" },
          { id: "bf", name: "Buffet Breakfast", name_bn: "বুফে নাস্তা", icon: "restaurant", is_free: true, fee_note_bn: "ফ্রি অন্তর্ভুক্ত" },
          { id: "jacuzzi", name: "Private Jacuzzi", name_bn: "ব্যক্তিগত জাকুজি", icon: "water", is_free: true, fee_note_bn: "ফ্রি" },
          { id: "shuttle", name: "Airport Shuttle", name_bn: "এয়ারপোর্ট পিকআপ", icon: "car", is_free: true, fee_note_bn: "ভিআইপি ফ্রি পিকআপ" },
          { id: "minibar", name: "Mini Bar", name_bn: "প্রিমিয়াম মিনিবার", icon: "wine", is_free: false, fee_note_bn: "অতিরিক্ত চার্জ" },
        ],
        image_urls: [
          "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800",
          "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800",
        ],
      },
    ],
  },
  {
    id: "hotel-cox-2",
    name: "Sayeman Beach Resort",
    city: "Cox's Bazar",
    country: "Bangladesh",
    address: "Marine Drive Road, Kolatoli, Cox's Bazar",
    latitude: 21.4180,
    longitude: 91.9820,
    star_rating: 4.8,
    average_rating: 4.7,
    total_reviews: 580,
    base_price: 9200,
    image_url: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800",
    images: [
      "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800",
      "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800",
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800",
    ],
    categorized_images: [
      { url: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800", category: "exterior", caption: "Beachfront Infinity Pool & Deck", caption_bn: "সৈকতমুখী ইনফিনিটি পুল" },
      { url: "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800", category: "room", caption: "Ocean View Deluxe King Room", caption_bn: "ডিলাক্স ওশান ভিউ রুম" },
      { url: "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800", category: "bathroom", caption: "Modern Glass Rain Shower", caption_bn: "গ্লাস রেইন শাওয়ার বাথরুম" },
    ],
    amenities: ["Ocean View Infinity Pool", "Free Breakfast", "Free Wi-Fi", "Beachfront Cabanas", "Fitness Center"],
    detailed_amenities: [
      { id: "wifi", name: "High-Speed Wi-Fi", name_bn: "ফ্রি ওয়াই-ফাই", icon: "wifi", is_free: true, fee_note_bn: "ফ্রি আনলিমিটেড" },
      { id: "bf", name: "Morning Breakfast", name_bn: "সকালের নাস্তা", icon: "restaurant", is_free: true, fee_note_bn: "ফ্রি অন্তর্ভুক্ত" },
      { id: "pool", name: "Infinity Pool", name_bn: "ইনফিনিটি সুইমিং পুল", icon: "water", is_free: true, fee_note_bn: "ফ্রি এক্সেস" },
      { id: "beach", name: "Direct Beach Access", name_bn: "সৈকতে সরাসরি প্রবেশ", icon: "sunny", is_free: true, fee_note_bn: "ফ্রি" },
      { id: "gym", name: "Fitness Center", name_bn: "ফিটনেস জিম", icon: "barbell", is_free: true, fee_note_bn: "ফ্রি" },
      { id: "shuttle", name: "Airport Shuttle", name_bn: "এয়ারপোর্ট পিকআপ", icon: "car", is_free: false, fee_note_bn: "অতিরিক্ত চার্জ ৳৭৫০" },
      { id: "spa", name: "Tararom Spa", name_bn: "তারারম স্পা", icon: "sparkles", is_free: false, fee_note_bn: "অতিরিক্ত চার্জ" },
    ],
    nearby_landmarks: [
      { name: "Kolatoli Beach", name_bn: "কলাতলী সৈকত", distance: "৫০ মি", distance_bn: "৫০ মি", icon: "water-outline" },
      { name: "Sugandha Point", name_bn: "সুগন্ধা পয়েন্ট", distance: "৪০০ মি", distance_bn: "৪০০ মি", icon: "walk-outline" },
      { name: "Bus Stand", name_bn: "বাস টার্মিনাল", distance: "১ কিমি", distance_bn: "১ কিমি", icon: "bus-outline" },
      { name: "Airport", name_bn: "কক্সবাজার বিমানবন্দর", distance: "৩.৫ কিমি", distance_bn: "৩.৫ কিমি", icon: "airplane-outline" },
    ],
    landmarks_summary_bn: "সৈকত ৫০ মি · সুগন্ধা পয়েন্ট ৪০০ মি · বাস টার্মিনাল ১ কিমি · বিমানবন্দর ৩.৫ কিমি",
    landmarks_summary_en: "Beach 50m · Sugandha Point 400m · Bus Terminal 1km · Airport 3.5km",
    hotel_rooms: [
      {
        id: "room-sy-1",
        room_type: "Ocean View Deluxe King",
        description: "Direct panoramic views of the Kolatoli sea surf with private balcony.",
        max_occupancy: 2,
        base_price: 9200,
        bed_type: "1 King Bed",
        square_meters: 39,
        amenities: ["Sea View Balcony", "Free WiFi", "AC", "Rain Shower"],
        detailed_amenities: [
          { id: "wifi", name: "Free Wi-Fi", name_bn: "ফ্রি ওয়াই-ফাই", icon: "wifi", is_free: true, fee_note_bn: "ফ্রি" },
          { id: "bf", name: "Breakfast", name_bn: "সকালের নাস্তা", icon: "restaurant", is_free: true, fee_note_bn: "ফ্রি অন্তর্ভুক্ত" },
          { id: "ac", name: "AC", name_bn: "এসি", icon: "snow", is_free: true, fee_note_bn: "ফ্রি" },
          { id: "bar", name: "Mini Bar", name_bn: "মিনিবার", icon: "wine", is_free: false, fee_note_bn: "অতিরিক্ত চার্জ" },
        ],
        image_urls: ["https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800"],
      },
    ],
  },
  {
    id: "hotel-sajek-1",
    name: "Meghpunji Resort",
    city: "Sajek Valley",
    country: "Bangladesh",
    address: "Ruilui Para, Sajek, Rangamati",
    latitude: 23.3820,
    longitude: 92.2938,
    star_rating: 4.8,
    average_rating: 4.9,
    total_reviews: 310,
    base_price: 4500,
    image_url: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800",
    images: [
      "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800",
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800",
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800",
    ],
    categorized_images: [
      { url: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800", category: "view", caption: "Morning Sea of Clouds Valley View", caption_bn: "মেঘের সমুদ্র ও পাহাড়ের দৃশ্য" },
      { url: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800", category: "room", caption: "Wooden Eco Cottage Room", caption_bn: "কাঠের ইকো কটেজ রুম" },
      { url: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800", category: "exterior", caption: "Cliffside Bamboo Veranda", caption_bn: "পাহাড়ের কিনারায় বাঁশের ব্যালকনি" },
    ],
    amenities: ["Cloud View Balcony", "Campfire", "Traditional Food", "Solar Power", "24/7 Guide"],
    detailed_amenities: [
      { id: "wifi", name: "Satellite Wi-Fi", name_bn: "স্যাটেলাইট ওয়াই-ফাই", icon: "wifi", is_free: true, fee_note_bn: "লবিতে ফ্রি" },
      { id: "solar", name: "24/7 Solar Backup", name_bn: "২৪/৭ সৌর বিদ্যুৎ", icon: "sunny", is_free: true, fee_note_bn: "ফ্রি" },
      { id: "tea", name: "Morning Hilltop Tea", name_bn: "সকালের গরম পাহাড়ি চা", icon: "cafe", is_free: true, fee_note_bn: "ফ্রি অন্তর্ভুক্ত" },
      { id: "bonfire", name: "Campfire & BBQ Setup", name_bn: "ক্যাম্পফায়ার ও বারবিকিউ", icon: "flame", is_free: false, fee_note_bn: "অতিরিক্ত চার্জ ৳৫০০" },
      { id: "guide", name: "Konglak Hill Trek Guide", name_bn: "স্থানীয় ট্রেকিং গাইড", icon: "compass", is_free: false, fee_note_bn: "অতিরিক্ত চার্জ ৳৪০০" },
    ],
    nearby_landmarks: [
      { name: "Helipad Viewpoint", name_bn: "হেলি প্যাড", distance: "২০০ মি", distance_bn: "২০০ মি", icon: "pin-outline" },
      { name: "Sajek Local Bazaar", name_bn: "সাজেক বাজার", distance: "৩০০ মি", distance_bn: "৩০০ মি", icon: "cart-outline" },
      { name: "Konglak Peak", name_bn: "কংলাক পাহাড়", distance: "১.৫ কিমি", distance_bn: "১.৫ কিমি", icon: "trending-up-outline" },
      { name: "Dighinala Chander Gari Stand", name_bn: "চাঁদের গাড়ি স্ট্যান্ড", distance: "২৫০ মি", distance_bn: "২৫০ মি", icon: "car-outline" },
    ],
    landmarks_summary_bn: "হেলি প্যাড ২০০ মি · সাজেক বাজার ৩০০ মি · চাঁদের গাড়ি ২৫০ মি · কংলাক পাহাড় ১.৫ কিমি",
    landmarks_summary_en: "Helipad 200m · Sajek Bazaar 300m · Jeep Stand 250m · Konglak Peak 1.5km",
    hotel_rooms: [
      {
        id: "room-mp-1",
        room_type: "Meghla Cloud Cottage",
        description: "Wooden eco-cottage on cliffside with early morning sea of clouds view.",
        max_occupancy: 3,
        base_price: 4500,
        bed_type: "1 King + 1 Single",
        square_meters: 32,
        amenities: ["Private Balcony", "Cloud View", "Attached Bath", "Solar Backup"],
        detailed_amenities: [
          { id: "balcony", name: "Private Balcony", name_bn: "মেঘমুখী ব্যালকনি", icon: "expand", is_free: true, fee_note_bn: "ফ্রি" },
          { id: "hotwater", name: "Solar Hot Water", name_bn: "গরম পানি সুবিধা", icon: "water", is_free: true, fee_note_bn: "ফ্রি" },
          { id: "bbq", name: "BBQ Dinner", name_bn: "বারবিকিউ ডিনার", icon: "flame", is_free: false, fee_note_bn: "অতিরিক্ত চার্জ ৳৩৫০/প্লেট" },
        ],
        image_urls: ["https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800"],
      },
    ],
  },
  {
    id: "hotel-sylhet-1",
    name: "Grand Sylhet Hotel & Resort",
    city: "Sylhet",
    country: "Bangladesh",
    address: "Bypass Road, Boroshala, Sylhet",
    latitude: 24.9350,
    longitude: 91.8687,
    star_rating: 5,
    average_rating: 4.7,
    total_reviews: 280,
    base_price: 7200,
    image_url: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800",
    images: [
      "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800",
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800",
      "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800",
    ],
    categorized_images: [
      { url: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800", category: "exterior", caption: "5-Star Hotel Grand Facade", caption_bn: "গ্র্যান্ড সিলেট হোটেলের মূল ভবন" },
      { url: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800", category: "room", caption: "Deluxe Twin Bed Room", caption_bn: "ডিলাক্স টুইন বেডরুম" },
      { url: "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800", category: "bathroom", caption: "Marble Bath & Rain Shower", caption_bn: "মার্বেল বাথরুম ও আধুনিক শাওয়ার" },
    ],
    amenities: ["Rooftop Infinity Pool", "Helipad", "Fine Dining", "Spa & Wellness", "Free Airport Shuttle"],
    detailed_amenities: [
      { id: "wifi", name: "High-Speed Wi-Fi", name_bn: "ফ্রি ওয়াই-ফাই", icon: "wifi", is_free: true, fee_note_bn: "ফ্রি আনলিমিটেড" },
      { id: "shuttle", name: "Osmani Airport Shuttle", name_bn: "বিমানবন্দর ফ্রি পিকআপ", icon: "car", is_free: true, fee_note_bn: "ফ্রি সার্ভিস" },
      { id: "bf", name: "Continental Breakfast", name_bn: "বুফে সকালের নাস্তা", icon: "restaurant", is_free: true, fee_note_bn: "ফ্রি অন্তর্ভুক্ত" },
      { id: "pool", name: "Rooftop Pool", name_bn: "ছাদের সুইমিং পুল", icon: "water", is_free: true, fee_note_bn: "ফ্রি" },
      { id: "spa", name: "Aromatherapy Spa", name_bn: "স্পা ও থেরাপি", icon: "sparkles", is_free: false, fee_note_bn: "অতিরিক্ত চার্জ" },
    ],
    nearby_landmarks: [
      { name: "Osmani Airport", name_bn: "ওসমানী বিমানবন্দর", distance: "২.১ কিমি", distance_bn: "২.১ কিমি", icon: "airplane-outline" },
      { name: "Keane Bridge", name_bn: "ক্বীন ব্রিজ", distance: "৬ কিমি", distance_bn: "৬ কিমি", icon: "business-outline" },
      { name: "Sylhet Railway Station", name_bn: "রেলওয়ে স্টেশন", distance: "৭ কিমি", distance_bn: "৭ কিমি", icon: "train-outline" },
      { name: "Hazrat Shah Jalal Mazar", name_bn: "শাহজালাল মাজার", distance: "৫ কিমি", distance_bn: "৫ কিমি", icon: "location-outline" },
    ],
    landmarks_summary_bn: "বিমানবন্দর ২.১ কিমি · শাহজালাল মাজার ৫ কিমি · রেলস্টেশন ৭ কিমি · ক্বীন ব্রিজ ৬ কিমি",
    landmarks_summary_en: "Airport 2.1km · Shah Jalal Mazar 5km · Railway Station 7km · Keane Bridge 6km",
    hotel_rooms: [
      {
        id: "room-gs-1",
        room_type: "Deluxe Twin Bed Room",
        description: "Luxury city view room with rain shower and complimentary morning tea.",
        max_occupancy: 2,
        base_price: 7200,
        bed_type: "2 Twin Beds",
        square_meters: 38,
        amenities: ["Pool Access", "Buffet Breakfast", "City View", "Free WiFi"],
        detailed_amenities: [
          { id: "wifi", name: "Free Wi-Fi", name_bn: "ফ্রি ওয়াই-ফাই", icon: "wifi", is_free: true, fee_note_bn: "ফ্রি" },
          { id: "bf", name: "Buffet Breakfast", name_bn: "বুফে নাস্তা", icon: "restaurant", is_free: true, fee_note_bn: "ফ্রি অন্তর্ভুক্ত" },
          { id: "ac", name: "AC", name_bn: "এসি", icon: "snow", is_free: true, fee_note_bn: "ফ্রি" },
        ],
        image_urls: ["https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800"],
      },
    ],
  },
  {
    id: "hotel-sreemangal-1",
    name: "Dusai Resort & Spa",
    city: "Sreemangal",
    country: "Bangladesh",
    address: "Noliatekar, Moulvibazar, Sylhet Division",
    latitude: 24.3210,
    longitude: 91.7340,
    star_rating: 5,
    average_rating: 4.9,
    total_reviews: 512,
    base_price: 11000,
    image_url: "https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800",
    images: [
      "https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800",
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800",
    ],
    categorized_images: [
      { url: "https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800", category: "view", caption: "Lush Tea Estate Views & Water Villa", caption_bn: "চা বাগান ও ওয়াটার ভিলার নয়নাভিরাম দৃশ্য" },
      { url: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800", category: "room", caption: "Tea Valley Villa Suite Master Bed", caption_bn: "টি ভ্যালি ভিলা সুইট মাস্টার বেড" },
    ],
    amenities: ["Tea Garden View", "Infinity Pool", "Ayurvedic Spa", "Boating Lake", "Cycling Trails"],
    detailed_amenities: [
      { id: "wifi", name: "Resort Wi-Fi", name_bn: "ফ্রি ওয়াই-ফাই", icon: "wifi", is_free: true, fee_note_bn: "ফ্রি" },
      { id: "tea", name: "Tea Garden Safari Tour", name_bn: "চা বাগান ওয়াকিং ট্যুর", icon: "leaf", is_free: true, fee_note_bn: "ফ্রি অন্তর্ভুক্ত" },
      { id: "bf", name: "Garden Breakfast", name_bn: "গার্ডেন ব্রেকফাস্ট", icon: "restaurant", is_free: true, fee_note_bn: "ফ্রি অন্তর্ভুক্ত" },
      { id: "pool", name: "Tiered Infinity Pool", name_bn: "মাল্টি-লেয়ার সুইমিং পুল", icon: "water", is_free: true, fee_note_bn: "ফ্রি এক্সেস" },
      { id: "boating", name: "Lake Kayaking & Boating", name_bn: "লেকে বোট কায়াকিং", icon: "boat", is_free: false, fee_note_bn: "অতিরিক্ত চার্জ ৳৪০০" },
      { id: "spa", name: "Ayurvedic Herbal Spa", name_bn: "আয়ুর্বেদিক স্পা", icon: "sparkles", is_free: false, fee_note_bn: "পেইড প্যাকেজ" },
    ],
    nearby_landmarks: [
      { name: "Tea Valley Trails", name_bn: "চা বাগান", distance: "৫০ মি", distance_bn: "৫০ মি", icon: "leaf-outline" },
      { name: "Lawachara National Park", name_bn: "লাউয়াছড়া রেইনফরেস্ট", distance: "৫ কিমি", distance_bn: "৫ কিমি", icon: "tree-outline" },
      { name: "Sreemangal Railway Station", name_bn: "শ্রীমঙ্গল রেলস্টেশন", distance: "৮ কিমি", distance_bn: "৮ কিমি", icon: "train-outline" },
      { name: "Baikka Beel Wetland", name_bn: "বাইক্কা বিল", distance: "১৪ কিমি", distance_bn: "১৪ কিমি", icon: "water-outline" },
    ],
    landmarks_summary_bn: "চা বাগান ৫০ মি · লাউয়াছড়া ৫ কিমি · শ্রীমঙ্গল রেলস্টেশন ৮ কিমি · বাইক্কা বিল ১৪ কিমি",
    landmarks_summary_en: "Tea Garden 50m · Lawachara 5km · Railway Station 8km · Baikka Beel 14km",
    hotel_rooms: [
      {
        id: "room-ds-1",
        room_type: "Tea Valley Villa Suite",
        description: "Stand-alone villa nestled inside tea hills with outdoor jacuzzi and private lawn.",
        max_occupancy: 4,
        base_price: 11000,
        bed_type: "1 Super King Bed",
        square_meters: 65,
        amenities: ["Private Lawn", "Tea View", "Jacuzzi", "Breakfast", "Butler Service"],
        detailed_amenities: [
          { id: "wifi", name: "Free Wi-Fi", name_bn: "ফ্রি ওয়াই-ফাই", icon: "wifi", is_free: true, fee_note_bn: "ফ্রি" },
          { id: "bf", name: "Breakfast", name_bn: "সকালের নাস্তা", icon: "restaurant", is_free: true, fee_note_bn: "ফ্রি" },
          { id: "jacuzzi", name: "Outdoor Jacuzzi", name_bn: "আউটডোর জাকুজি", icon: "water", is_free: true, fee_note_bn: "ফ্রি" },
          { id: "butler", name: "Private Butler", name_bn: "ব্যক্তিগত বাটলার", icon: "person", is_free: false, fee_note_bn: "অতিরিক্ত চার্জ ৳১,৫০০" },
        ],
        image_urls: ["https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800"],
      },
    ],
  },
  {
    id: "hotel-dhaka-1",
    name: "Radisson Blu Dhaka Water Garden",
    city: "Dhaka",
    country: "Bangladesh",
    address: "Airport Road, Dhaka Cantonment, Dhaka",
    latitude: 23.8191,
    longitude: 90.4078,
    star_rating: 5,
    average_rating: 4.6,
    total_reviews: 640,
    base_price: 12500,
    image_url: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800",
    images: [
      "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800",
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800",
      "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800",
    ],
    categorized_images: [
      { url: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800", category: "exterior", caption: "7-Acre Water Garden & Lagoon", caption_bn: "৭ একর ওয়াটার গার্ডেন ও হোটেল" },
      { url: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800", category: "room", caption: "Superior Garden View King", caption_bn: "গার্ডেন ভিউ সুপিরিয়র রুম" },
      { url: "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800", category: "bathroom", caption: "Deep Soaking Marble Tub", caption_bn: "মার্বেল বাথটাব ও শাওয়ার" },
    ],
    amenities: ["7-Acre Garden", "Golf Putting Green", "Outdoor Pool", "Executive Club Lounge"],
    detailed_amenities: [
      { id: "wifi", name: "Gigabit Wi-Fi", name_bn: "ফ্রি গিগাবিট ওয়াই-ফাই", icon: "wifi", is_free: true, fee_note_bn: "ফ্রি আনলিমিটেড" },
      { id: "bf", name: "Water Garden Breakfast", name_bn: "ওয়াটার গার্ডেন বুফে নাস্তা", icon: "restaurant", is_free: true, fee_note_bn: "ফ্রি অন্তর্ভুক্ত" },
      { id: "pool", name: "Lagoon Swimming Pool", name_bn: "লাগুন সুইমিং পুল", icon: "water", is_free: true, fee_note_bn: "ফ্রি" },
      { id: "gym", name: "Gym & Steam Room", name_bn: "জিম ও স্টিম বাথ", icon: "barbell", is_free: true, fee_note_bn: "ফ্রি" },
      { id: "airport", name: "Airport Limousine", name_bn: "এয়ারপোর্ট লিমোজিন পিকআপ", icon: "car", is_free: false, fee_note_bn: "অতিরিক্ত চার্জ ৳১,৫০০" },
      { id: "laundry", name: "Same-Day Dry Cleaning", name_bn: "ড্রাই ক্লিনিং ও লন্ড্রি", icon: "shirt-outline", is_free: false, fee_note_bn: "অতিরিক্ত চার্জ" },
    ],
    nearby_landmarks: [
      { name: "Hazrat Shahjalal Airport", name_bn: "শাহজালাল বিমানবন্দর", distance: "৪ কিমি", distance_bn: "৪ কিমি", icon: "airplane-outline" },
      { name: "Army Golf Club", name_bn: "আর্মি গল্ফ ক্লাব", distance: "৫০০ মি", distance_bn: "৫০০ মি", icon: "flag-outline" },
      { name: "Jamuna Future Park", name_bn: "যমুনা ফিউচার পার্ক", distance: "৩ কিমি", distance_bn: "৩ কিমি", icon: "cart-outline" },
      { name: "Airport Railway Station", name_bn: "বিমানবন্দর রেলস্টেশন", distance: "৩.৮ কিমি", distance_bn: "৩.৮ কিমি", icon: "train-outline" },
    ],
    landmarks_summary_bn: "আর্মি গল্ফ ক্লাব ৫০০ মি · যমুনা ফিউচার পার্ক ৩ কিমি · বিমানবন্দর ৪ কিমি · রেলস্টেশন ৩.৮ কিমি",
    landmarks_summary_en: "Golf Club 500m · Jamuna Park 3km · Airport 4km · Rail Station 3.8km",
    hotel_rooms: [
      {
        id: "room-rb-1",
        room_type: "Superior Garden View",
        description: "Elegant room overlooking water garden.",
        max_occupancy: 2,
        base_price: 12500,
        bed_type: "1 King Bed",
        square_meters: 40,
        amenities: ["Free WiFi", "Garden View", "Work Desk", "AC"],
        detailed_amenities: [
          { id: "wifi", name: "Free Wi-Fi", name_bn: "ফ্রি ওয়াই-ফাই", icon: "wifi", is_free: true, fee_note_bn: "ফ্রি" },
          { id: "bf", name: "Breakfast", name_bn: "বুফে নাস্তা", icon: "restaurant", is_free: true, fee_note_bn: "ফ্রি" },
          { id: "ac", name: "AC", name_bn: "এসি", icon: "snow", is_free: true, fee_note_bn: "ফ্রি" },
        ],
        image_urls: ["https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800"],
      },
    ],
  },
  {
    id: "hotel-dhaka-2",
    name: "InterContinental Dhaka",
    city: "Dhaka",
    country: "Bangladesh",
    address: "1 Minto Road, Shahbagh, Dhaka",
    latitude: 23.7420,
    longitude: 90.3980,
    star_rating: 5,
    average_rating: 4.8,
    total_reviews: 790,
    base_price: 14000,
    image_url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
    images: [
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
      "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800",
    ],
    categorized_images: [
      { url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800", category: "exterior", caption: "Historic Luxury Hotel in Central Dhaka", caption_bn: "ঢাকার প্রাণকেন্দ্রে ইন্টারকন্টিনেন্টাল হোটেল" },
      { url: "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800", category: "room", caption: "Club InterContinental Suite", caption_bn: "ক্লাব ইন্টারকন্টিনেন্টাল সুইট রুম" },
    ],
    amenities: ["Central Location", "Heated Pool", "Club Lounge", "Heritage Walk"],
    detailed_amenities: [
      { id: "wifi", name: "High-Speed Wi-Fi", name_bn: "ফ্রি ওয়াই-ফাই", icon: "wifi", is_free: true, fee_note_bn: "ফ্রি আনলিমিটেড" },
      { id: "bf", name: "Elements Buffet Breakfast", name_bn: "এলিমেন্টস বুফে নাস্তা", icon: "restaurant", is_free: true, fee_note_bn: "ফ্রি অন্তর্ভুক্ত" },
      { id: "pool", name: "Heated Swimming Pool", name_bn: "হিটেড সুইমিং পুল", icon: "water", is_free: true, fee_note_bn: "ফ্রি" },
      { id: "shuttle", name: "VIP Airport Transfer", name_bn: "ভিআইপি এয়ারপোর্ট ট্রান্সফার", icon: "car", is_free: false, fee_note_bn: "অতিরিক্ত চার্জ ৳১,৮০০" },
    ],
    nearby_landmarks: [
      { name: "Ramna Park", name_bn: "রমনা পার্ক", distance: "১০০ মি", distance_bn: "১০০ মি", icon: "leaf-outline" },
      { name: "Dhaka Metro Rail Station", name_bn: "মেট্রোরেল স্টেশন", distance: "৩০০ মি", distance_bn: "৩০০ মি", icon: "train-outline" },
      { name: "Dhaka University Campus", name_bn: "ঢাকা বিশ্ববিদ্যালয়", distance: "১ কিমি", distance_bn: "১ কিমি", icon: "school-outline" },
      { name: "Shahjalal Airport", name_bn: "বিমানবন্দর", distance: "১২ কিমি", distance_bn: "১২ কিমি", icon: "airplane-outline" },
    ],
    landmarks_summary_bn: "রমনা পার্ক ১০০ মি · মেট্রোরেল স্টেশন ৩০০ মি · ঢাবি ১ কিমি · বিমানবন্দর ১২ কিমি",
    landmarks_summary_en: "Ramna Park 100m · Metro Station 300m · DU Campus 1km · Airport 12km",
    hotel_rooms: [
      {
        id: "room-ic-1",
        room_type: "Classic King Heritage Room",
        description: "Opulent room in the heart of Dhaka with park views.",
        max_occupancy: 2,
        base_price: 14000,
        bed_type: "1 King Bed",
        square_meters: 44,
        amenities: ["Park View", "Free WiFi", "Marble Bath", "AC"],
        detailed_amenities: [
          { id: "wifi", name: "Free Wi-Fi", name_bn: "ফ্রি ওয়াই-ফাই", icon: "wifi", is_free: true, fee_note_bn: "ফ্রি" },
          { id: "bf", name: "Buffet Breakfast", name_bn: "বুফে নাস্তা", icon: "restaurant", is_free: true, fee_note_bn: "ফ্রি" },
        ],
        image_urls: ["https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800"],
      },
    ],
  },
];
