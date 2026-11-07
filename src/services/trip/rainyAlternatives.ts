/**
 * Rainy Day Activity Alternatives
 *
 * Provides curated indoor alternatives and swap suggestions for rainy/stormy days,
 * ensuring travelers have fulfilling indoor plans when outdoor activities are rain-affected.
 */

import { TripActivity } from "../ai/types";

export interface RainyAlternativeItem {
  id: string;
  name: string;
  category: "aquarium" | "museum" | "shopping" | "cafe_dining" | "culture" | "indoor_attraction";
  icon: string;
  location: string;
  duration: string;
  estimatedCost: number;
  description: string;
  whyRainFriendly: string;
}

const DESTINATION_RAINY_ALTERNATIVES: Record<string, RainyAlternativeItem[]> = {
  "cox's bazar": [
    {
      id: "cb_aquarium",
      name: "রেডিয়েন্ট ফিশ ওয়ার্ল্ড অ্যাকোয়ারিয়াম (Radiant Fish World)",
      category: "aquarium",
      icon: "water",
      location: "ঝাউতলা রোড, কক্সবাজার সদর",
      duration: "2.5 hours",
      estimatedCost: 800,
      description: "বাংলাদেশের প্রথম আন্তর্জাতিক মানের আন্তর্জাতিক সামুদ্রিক অ্যাকোয়ারিয়াম ও থ্রিডি শো।",
      whyRainFriendly: "১০০% সম্পূর্ণ শীতাতপ নিয়ন্ত্রিত ইনডোর অ্যাকোয়ারিয়াম কমপ্লেক্স।",
    },
    {
      id: "cb_burmese_market",
      name: "বার্মিজ মার্কেট ইনডোর শপিং ও হস্তশিল্প",
      category: "shopping",
      icon: "bag-handle",
      location: "টেকপাড়া বার্মিজ মার্কেট",
      duration: "2 hours",
      estimatedCost: 1500,
      description: "স্থানীয় বার্মিজ আচার, চকোলেট, মণিপুরি চাদর ও হস্তশিল্পের ইনডোর দোকানপাট।",
      whyRainFriendly: "ছাদযুক্ত মার্কেট কমপ্লেক্স, বৃষ্টির মধ্যেও স্বাচ্ছন্দ্যে কেনাকাটা করা যায়।",
    },
    {
      id: "cb_indoor_cafe",
      name: "মেরিন ড্রাইভ সি-ভিউ ইনডোর ক্যাফে ও লাইভ কফি",
      category: "cafe_dining",
      icon: "cafe",
      location: "কলাতলী মেরিন ড্রাইভ",
      duration: "1.5 hours",
      estimatedCost: 600,
      description: "কাঁচের জানালার ওপারে বৃষ্টির মধ্যে উত্তাল সাগরের ঢেউ দেখা এবং গরম কফি ও পেস্ট্রি।",
      whyRainFriendly: "আরামদায়ক সোফায় বসে নিরাপদ গ্লাস-ফ্রেম থেকে সৈকতের বৃষ্টি উপভোগ।",
    },
    {
      id: "cb_seafood_banquet",
      name: "পৌষী বা ঝাউবনে দীর্ঘ ঐতিহ্যবাহী সী-ফুড ডাইনিং",
      category: "cafe_dining",
      icon: "restaurant",
      location: "কলাতলী রোড",
      duration: "2 hours",
      estimatedCost: 900,
      description: "বৃষ্টির দিনে গরম ভাতের সাথে রূপচাঁদা ফ্রাই, লইট্টা ফ্রাই ও ১৫ পদের শুঁটকি ভর্তা।",
      whyRainFriendly: "বৃষ্টির দিনে স্থানীয় স্বাদের খাঁটি উপভোগ ও রিল্যাক্সড লাঞ্চ।",
    },
  ],
  sylhet: [
    {
      id: "syl_rajas_museum",
      name: "মিউজিয়াম অব রাজাস (হাছন রাজার বাড়ি)",
      category: "museum",
      icon: "business",
      location: "জিন্দাবাজার, সিলেট",
      duration: "2 hours",
      estimatedCost: 200,
      description: "মরমী কবি হাছন রাজার স্মৃতিবিজড়িত ঐতিহাসিক বাড়ি, পান্ডুলিপি ও প্রাচীন বাদ্যযন্ত্র।",
      whyRainFriendly: "প্রাচীন ঐতিহাসিক ভবনের ভেতর সম্পূর্ণ সংরক্ষিত ইনডোর প্রদর্শনী।",
    },
    {
      id: "syl_tea_lounge",
      name: "জাফলং ইনডোর টি লাউঞ্জ ও মনিপুরী ক্লথ সেন্টার",
      category: "shopping",
      icon: "shirt",
      location: "জিন্দাবাজার ও আম্বরখানা",
      duration: "2 hours",
      estimatedCost: 1200,
      description: "সিলেটের ঐতিহ্যবাহী মনিপুরী তাঁতের পোশাক ও প্রিমিয়াম চা কেনার ইনডোর সেন্টার।",
      whyRainFriendly: "আরামদায়ক ছাদযুক্ত শোরুম ও টি-টেস্টিং জোন।",
    },
    {
      id: "syl_osmani_museum",
      name: "ওসমানী মেমোরিয়াল যাদুঘর",
      category: "museum",
      icon: "ribbon",
      location: "কোট রোড, সিলেট",
      duration: "1.5 hours",
      estimatedCost: 100,
      description: "মুক্তিযুদ্ধের সর্বাধিনায়ক জেনারেল এম এ জি ওসমানীর ঐতিহাসিক বাসভবন ও সংগ্রহশালা।",
      whyRainFriendly: "বৃষ্টির দিনে ইতিহাস জানার সম্পূর্ণ ইনডোর সুযোগ।",
    },
  ],
  "sajek valley": [
    {
      id: "sajek_cottage_lounge",
      name: "মেঘের দৃশ্যসহ কটেজ ব্যালকনিতে আড্ডা ও হট কফি",
      category: "cafe_dining",
      icon: "cloud",
      location: "রুইলুই পাড়া, সাজেক",
      duration: "3 hours",
      estimatedCost: 300,
      description: "সাজেকের পাহাড়ে বৃষ্টির নৃত্য আর চোখের সামনে মেঘের ভেসে চলা এক স্বর্গীয় অনুভূতি।",
      whyRainFriendly: "কটেজের নিরাপদ ছায়ায় বসে বৃষ্টি ও মেঘের মিলনমেলা উপভোগ।",
    },
    {
      id: "sajek_craft_center",
      name: "স্থানীয় ত্রিপুরা ও লুসাই আদিবাসী হস্তশিল্প কেন্দ্র",
      category: "culture",
      icon: "color-palette",
      location: "কংলাক ও রুইলুই ক্লাব",
      duration: "2 hours",
      estimatedCost: 500,
      description: "পাহাড়ি নারীদের ঐতিহ্যবাহী কোমর তাঁত এবং বাঁশ ও বেতের ইনডোর কারুশিল্প।",
      whyRainFriendly: "বৃষ্টি থেকে নিরাপদে থাকা ইনডোর কারুশিল্প কেন্দ্র।",
    },
  ],
  sreemangal: [
    {
      id: "sreemangal_tea_museum",
      name: "বাংলাদেশ চা গবেষণা ইনস্টিটিউট (BTRI) জাদুঘর",
      category: "museum",
      icon: "leaf",
      location: "বিটিআরআই ক্যাম্পাস, শ্রীমঙ্গল",
      duration: "2 hours",
      estimatedCost: 150,
      description: "চা শিল্পের প্রাচীন যন্ত্রপাতি, নমুনা ও চা তৈরির ইতিহাস সম্পর্কিত জাদুঘর।",
      whyRainFriendly: "ইনডোর অডিটোরিয়াম ও প্রদর্শনী হল।",
    },
    {
      id: "sreemangal_indoor_tasting",
      name: "নীলকণ্ঠ ইনডোর টি পার্লার ও স্ন্যাকস",
      category: "cafe_dining",
      icon: "cafe",
      location: "রামনগর চা বাগান মোড়",
      duration: "1.5 hours",
      estimatedCost: 300,
      description: "বৃষ্টির দিনে গরম লেয়ার চা, বাকরখানি এবং আড্ডা।",
      whyRainFriendly: "ইনডোর বসার ক্যাবিন।",
    },
  ],
};

const DEFAULT_RAINY_ALTERNATIVES: RainyAlternativeItem[] = [
  {
    id: "def_cultural_center",
    name: "স্থানীয় আর্ট গ্যালারি ও ঐতিহ্যবাহী সাংস্কৃতিক কেন্দ্র",
    category: "culture",
    icon: "easel",
    location: "শহরের প্রধান কেন্দ্র",
    duration: "2 hours",
    estimatedCost: 200,
    description: "স্থানীয় চিত্রকর্ম, ঐতিহ্যবাহী ভাস্কর্য ও সাংস্কৃতিক প্রদর্শনী।",
    whyRainFriendly: "আরামদায়ক ইনডোর গ্যালারি যেখানে আবহাওয়ার কোনো প্রভাব পড়ে না।",
  },
  {
    id: "def_indoor_food_trail",
    name: "ঐতিহ্যবাহী লোকজ ডাইনিং ও বিশেষ চা-ক্যাফে আড্ডা",
    category: "cafe_dining",
    icon: "restaurant",
    location: "ঐতিহ্যবাহী রেস্তোরাঁ পাড়া",
    duration: "2 hours",
    estimatedCost: 700,
    description: "বৃষ্টির দিনে গরম ভুনা খিচুড়ি, কাবাব ও আঞ্চলিক মিষ্টান্ন ভোজ।",
    whyRainFriendly: "বৃষ্টির আবহাওয়ায় উষ্ণ ডাইনিং উপভোগ করার সেরা ব্যবস্থা।",
  },
  {
    id: "def_souvenir_mall",
    name: "ইনডোর হস্তশিল্প মার্কেট ও স্যুভেনির শপিং",
    category: "shopping",
    icon: "bag",
    location: "প্রধান বাজার এলাকা",
    duration: "2 hours",
    estimatedCost: 1000,
    description: "পরিবার ও বন্ধুদের জন্য হস্তনির্মিত উপহার ও আঞ্চলিক পণ্য সংগ্রহ।",
    whyRainFriendly: "সম্পূর্ণ ছাদযুক্ত নিরাপদ মার্কেট কমপ্লেক্স।",
  },
];

/**
 * Get rainy day indoor alternatives for a given destination.
 */
export function getRainyAlternatives(destination: string): RainyAlternativeItem[] {
  const norm = (destination || "").toLowerCase().trim();
  for (const [key, items] of Object.entries(DESTINATION_RAINY_ALTERNATIVES)) {
    if (norm.includes(key) || key.includes(norm)) {
      return items;
    }
  }
  return DEFAULT_RAINY_ALTERNATIVES;
}

/**
 * Convert a RainyAlternativeItem into a TripActivity.
 */
export function alternativeToActivity(alt: RainyAlternativeItem, timeSlot: string = "02:00 PM"): TripActivity {
  return {
    time: timeSlot,
    activity: `[বৃষ্টির বিকল্প] ${alt.name}`,
    location: alt.location,
    duration: alt.duration,
    estimatedCost: alt.estimatedCost,
    notes: `বৃষ্টির কারণে ইনডোর বিকল্প: ${alt.description} (${alt.whyRainFriendly})`,
  };
}
