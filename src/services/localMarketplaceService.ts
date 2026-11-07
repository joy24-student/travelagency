import AsyncStorage from "@react-native-async-storage/async-storage";
import { LocalProduct, NewProductListing, ProductOrder } from "../types/localMarketplace";
import { supabase } from "../utils/supabase";

const PRODUCTS_STORAGE_KEY = "@local_products_catalog_v1";
const ORDERS_STORAGE_KEY = "@local_product_orders_v1";

export const INITIAL_PRODUCTS: LocalProduct[] = [
  {
    id: "prod-honey-1",
    name: "Pure Sundarbans Wild Honey",
    bangla_name: "সুন্দরবনের খাঁটি বুনো খলিশা ফুলের মধু",
    region: "সুন্দরবন",
    category: "tea_honey",
    price: 1100,
    original_price: 1350,
    weight_or_unit: "১ কেজি কাঁচের জার",
    image_url: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600",
    rating: 4.95,
    reviews_count: 248,
    seller_name: "মোংলা মৌয়াল সমবায় সমিতি",
    seller_phone: "+8801711224466",
    seller_verified: true,
    in_stock: true,
    stock_quantity: 45,
    description: "সুন্দরবনের গহীন অরণ্য থেকে মৌয়ালদের দ্বারা সরাসরি চাক কেটে সংগৃহীত ১০০% নির্ভেজাল খলিশা ফুলের প্রাকৃতিক মধু। কোনো কৃত্রিম মিষ্টি বা প্রিজারভেটিভ নেই।",
    features: ["১০০% ন্যাচারাল", "ল্যাব টেস্টেড", "সুন্দরবন ফরেস্ট পারমিট সংগৃহীত"],
  },
  {
    id: "prod-shutki-1",
    name: "Cox's Bazar Sea Rupchanda Shutki",
    bangla_name: "কক্সবাজারের সামুদ্রিক রূপচাঁদা শুঁটকি",
    region: "কক্সবাজার",
    category: "food",
    price: 850,
    original_price: 980,
    weight_or_unit: "৫০০ গ্রাম প্রিমিয়াম প্যাক",
    image_url: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600",
    rating: 4.88,
    reviews_count: 180,
    seller_name: "নাজিরারটেক ড্রাই ফিশ হাফিজ ট্রেডার্স",
    seller_phone: "+8801819887766",
    seller_verified: true,
    in_stock: true,
    stock_quantity: 30,
    description: "কক্সবাজারের বিখ্যাত নাজিরারটেক শুঁটকি মহাল থেকে সংগ্রহ করা বিষমুক্ত রোদে শুকানো ফ্রেশ সামুদ্রিক রূপচাঁদা শুঁটকি। সুস্বাদু ঝাল চাটনি ও রান্নায় অতুলনীয়।",
    features: ["কীটনাশক মুক্ত", "প্রাকৃতিক সূর্যালোক শুকানো", "অ্যারোমা সিল ভ্যাকুয়াম প্যাক"],
  },
  {
    id: "prod-tea-1",
    name: "Sreemangal First Flush Black Tea",
    bangla_name: "শ্রীমঙ্গলের অরগানিক ব্ল্যাক টি পাতা",
    region: "সিলেট",
    category: "tea_honey",
    price: 450,
    original_price: 520,
    weight_or_unit: "৪০০ গ্রাম ফয়েল প্যাক",
    image_url: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600",
    rating: 4.9,
    reviews_count: 165,
    seller_name: "মৌলভীবাজার টি গার্ডেন ডিরেক্ট",
    seller_phone: "+8801733556677",
    seller_verified: true,
    in_stock: true,
    stock_quantity: 60,
    description: "শ্রীমঙ্গলের পাহাড়ি বাগানের কোমল দুটি পাতা ও একটি কুঁড়ি থেকে প্রস্তুতকৃত কড়া লিকার ও মনমাতানো সুগন্ধযুক্ত প্রিমিয়াম চা।",
    features: ["অরগানিক বাগান", "তাজা সুবাস", "গাঢ় সোনালী লিকার"],
  },
  {
    id: "prod-saree-1",
    name: "Authentic Tangail Handloom Cotton Saree",
    bangla_name: "ঐতিহ্যবাহী টাঙ্গাইল সুতি তাঁতের শাড়ি",
    region: "টাঙ্গাইল",
    category: "clothing",
    price: 2400,
    original_price: 2850,
    weight_or_unit: "১২ হাত শাড়ি + ব্লাউজ পিস",
    image_url: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600",
    rating: 4.92,
    reviews_count: 95,
    seller_name: "বাজিতপুর তাঁতী সমিতি, টাঙ্গাইল",
    seller_phone: "+8801911443322",
    seller_verified: true,
    in_stock: true,
    stock_quantity: 18,
    description: "টাঙ্গাইলের দক্ষ কারিগরদের হাতে বোনা নরম সুতি সুতার মনোরম জাকার্ড পাড়ের আকর্ষণীয় তাঁতের শাড়ি। গরমে দারুণ আরামদায়ক ও রুচিশীল।",
    features: ["১০০% পিওর কটন", "হাতে বোনা সুতা", "রং পাকা গ্যারান্টি"],
  },
  {
    id: "prod-doi-1",
    name: "Traditional Bogura Special Shahi Doi",
    bangla_name: "বগুড়ার ঐতিহ্যবাহী আসল শাহী দই",
    region: "বগুড়া",
    category: "food",
    price: 360,
    original_price: 400,
    weight_or_unit: "১ কেজি পোড়ামাটির সরা",
    image_url: "https://images.unsplash.com/photo-1541658016709-82535e94bc69?w=600",
    rating: 4.96,
    reviews_count: 310,
    seller_name: "আকবরিয়া দই ঘর, বগুড়া",
    seller_phone: "+8801712998855",
    seller_verified: true,
    in_stock: true,
    stock_quantity: 25,
    description: "খাঁটি গাভীর দুধ জ্বাল দিয়ে ঘন ক্ষীরসা বানিয়ে মাটির সরায় পাতা বগুড়ার শতবর্ষী ঐতিহাসিক ঐতিহ্যবাহী মিষ্টি দই। বিশেষ কুলিং বক্সে হোম ডেলিভারি।",
    features: ["গাভীর খাঁটি দুধ", "ঐতিহ্যবাহী মাটির সরা", "কুলিং প্রটেকশন শিপিং"],
  },
  {
    id: "prod-kanchagolla-1",
    name: "Natore Bonolota Kanchagolla",
    bangla_name: "নাটোরের আদি বনলতা কাঁচাগোল্লা",
    region: "নাটোর",
    category: "food",
    price: 520,
    original_price: 580,
    weight_or_unit: "১ কেজি বক্স",
    image_url: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600",
    rating: 4.85,
    reviews_count: 140,
    seller_name: "নাটোর রাজবাড়ি মিষ্টান্ন ভান্ডার",
    seller_phone: "+8801822339900",
    seller_verified: true,
    in_stock: true,
    stock_quantity: 20,
    description: "তাজা ছানা ও খাঁটি এলাচের সুবাসে তৈরি নাটোরের বিখ্যাত জিভে জল আনা নরম কাঁচাগোল্লা।",
    features: ["তাজা ছানা", "হালকা মিষ্টি", "এয়ার টাইট প্যাকেজিং"],
  },
];

export const localMarketplaceService = {
  /**
   * Fetch products with optional filtering
   */
  async getProducts(filters?: { region?: string; category?: string; query?: string }): Promise<LocalProduct[]> {
    let list = INITIAL_PRODUCTS;

    try {
      const raw = await AsyncStorage.getItem(PRODUCTS_STORAGE_KEY);
      if (raw) {
        list = JSON.parse(raw);
      } else {
        await AsyncStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(INITIAL_PRODUCTS));
      }
    } catch (storageErr) {
      console.warn("[localMarketplaceService] Error reading products cache:", storageErr);
    }

    let result = [...list];

    if (filters?.region && filters.region !== "All") {
      result = result.filter((p) => p.region.includes(filters.region!));
    }

    if (filters?.category && filters.category !== "all") {
      result = result.filter((p) => p.category === filters.category);
    }

    if (filters?.query && filters.query.trim().length > 0) {
      const q = filters.query.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.bangla_name.toLowerCase().includes(q) ||
          p.region.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      );
    }

    return result;
  },

  /**
   * Add a new product listing (স্থানীয় সেলাররা পণ্য বিক্রি করতে পারবে)
   */
  async createProductListing(listing: NewProductListing): Promise<LocalProduct> {
    const newProduct: LocalProduct = {
      id: `prod-${Date.now()}`,
      name: listing.name,
      bangla_name: listing.bangla_name,
      region: listing.region,
      category: listing.category,
      price: Number(listing.price) || 500,
      original_price: Math.round(Number(listing.price) * 1.15),
      weight_or_unit: listing.weight_or_unit,
      image_url: listing.image_url || "https://images.unsplash.com/photo-1544816155-12df9643f363?w=600",
      rating: 5.0,
      reviews_count: 1,
      seller_name: listing.seller_name,
      seller_phone: listing.seller_phone,
      seller_verified: true,
      in_stock: true,
      stock_quantity: 20,
      description: listing.description,
      features: ["১০০% স্থানীয় পণ্য", "ভেরিফাইড সেলার", "ফ্রেশ কোয়ালিটি"],
    };

    const raw = await AsyncStorage.getItem(PRODUCTS_STORAGE_KEY);
    const existing: LocalProduct[] = raw ? JSON.parse(raw) : INITIAL_PRODUCTS;
    const updated = [newProduct, ...existing];
    await AsyncStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(updated));

    return newProduct;
  },

  /**
   * Place an order for a local product
   */
  async placeProductOrder(
    orderData: Omit<ProductOrder, "id" | "status" | "created_at">
  ): Promise<ProductOrder> {
    const newOrder: ProductOrder = {
      ...orderData,
      id: `ord-${Date.now()}`,
      status: "order_placed",
      created_at: new Date().toISOString(),
    };

    try {
      await supabase.from("bookings").insert([
        {
          booking_type: "marketplace_product",
          total_price: newOrder.total_price,
          status: "confirmed",
          metadata: newOrder,
        },
      ]);
    } catch (syncErr) {
      console.warn("[localMarketplaceService] Remote order sync failed, saving locally:", syncErr);
    }

    const raw = await AsyncStorage.getItem(ORDERS_STORAGE_KEY);
    const existing: ProductOrder[] = raw ? JSON.parse(raw) : [];
    const updated = [newOrder, ...existing];
    await AsyncStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(updated));

    return newOrder;
  },

  async getMyOrders(): Promise<ProductOrder[]> {
    try {
      const raw = await AsyncStorage.getItem(ORDERS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },
};
