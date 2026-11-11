export interface LocalProduct {
  id: string;
  name: string;
  bangla_name: string;
  region: string; // e.g. "সুন্দরবন", "কক্সবাজার", "সিলেট", "টাঙ্গাইল", "রাজশাহী", "বগুড়া"
  category: "food" | "handicraft" | "clothing" | "tea_honey";
  price: number; // in BDT (৳)
  original_price?: number;
  weight_or_unit: string; // e.g. "১ কেজি", "৫০০ গ্রাম", "১টি"
  image_url: string;
  rating: number;
  reviews_count: number;
  seller_name: string;
  seller_phone: string;
  seller_verified: boolean;
  in_stock: boolean;
  stock_quantity: number;
  description: string;
  features: string[];
}

export interface NewProductListing {
  name: string;
  bangla_name: string;
  region: string;
  category: "food" | "handicraft" | "clothing" | "tea_honey";
  price: number;
  weight_or_unit: string;
  image_url?: string;
  seller_name: string;
  seller_phone: string;
  description: string;
}

export interface ProductOrder {
  id: string;
  product_id: string;
  product_name: string;
  product_image: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  delivery_district: string;
  payment_method: "cod" | "bkash" | "nagad";
  status: "order_placed" | "processing" | "shipped" | "delivered";
  created_at: string;
}
