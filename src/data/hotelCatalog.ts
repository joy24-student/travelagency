export const FALLBACK_HOTELS = [
  {
    id: "hotel-cox-1",
    name: "Sea Pearl Beach Resort & Spa",
    city: "Cox's Bazar",
    country: "Bangladesh",
    address: "Jaliapalong, Inani, Cox's Bazar",
    star_rating: 5,
    average_rating: 4.8,
    total_reviews: 420,
    base_price: 8500,
    image_url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
    images: [
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800"
    ],
    amenities: ["Free Wi-Fi", "Swimming Pool", "Private Beach", "Breakfast Included", "Ocean View"],
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
        image_urls: ["https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800"]
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
        image_urls: ["https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800"]
      }
    ]
  },
  {
    id: "hotel-sajek-1",
    name: "Meghpunji Resort",
    city: "Sajek Valley",
    country: "Bangladesh",
    address: "Ruilui Para, Sajek, Rangamati",
    star_rating: 4.8,
    average_rating: 4.9,
    total_reviews: 310,
    base_price: 4500,
    image_url: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800",
    images: [
      "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800",
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800"
    ],
    amenities: ["Cloud View Balcony", "Campfire", "Traditional Food", "Solar Power", "24/7 Guide"],
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
        image_urls: ["https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800"]
      }
    ]
  },
  {
    id: "hotel-sylhet-1",
    name: "Grand Sylhet Hotel & Resort",
    city: "Sylhet",
    country: "Bangladesh",
    address: "Bypass Road, Boroshala, Sylhet",
    star_rating: 5,
    average_rating: 4.7,
    total_reviews: 280,
    base_price: 7200,
    image_url: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800",
    images: [
      "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800"
    ],
    amenities: ["Rooftop Infinity Pool", "Helipad", "Fine Dining", "Spa & Wellness", "Free Airport Shuttle"],
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
        image_urls: ["https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800"]
      }
    ]
  },
  {
    id: "hotel-sreemangal-1",
    name: "Dusai Resort & Spa",
    city: "Sreemangal",
    country: "Bangladesh",
    address: "Noliatekar, Moulvibazar, Sylhet Division",
    star_rating: 5,
    average_rating: 4.9,
    total_reviews: 512,
    base_price: 11000,
    image_url: "https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800",
    images: [
      "https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800"
    ],
    amenities: ["Tea Garden View", "Infinity Pool", "Ayurvedic Spa", "Boating Lake", "Cycling Trails"],
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
        image_urls: ["https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800"]
      }
    ]
  },
  {
    id: "hotel-dhaka-1",
    name: "Radisson Blu Dhaka Water Garden",
    city: "Dhaka",
    country: "Bangladesh",
    address: "Airport Road, Dhaka Cantonment, Dhaka",
    star_rating: 5,
    average_rating: 4.6,
    total_reviews: 640,
    base_price: 12500,
    image_url: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800",
    images: ["https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800"],
    amenities: ["7-Acre Garden", "Golf Putting Green", "Outdoor Pool", "Executive Club Lounge"],
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
        image_urls: ["https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800"]
      }
    ]
  }
];
