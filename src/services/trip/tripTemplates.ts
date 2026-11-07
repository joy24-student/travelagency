/**
 * Ready-to-go Trip Planner Templates
 *
 * Provides curated, realistic itineraries for top Bangladesh destinations
 * that can be copied or instantiated with a single tap, eliminating the blank-page hurdle.
 */

import { TripPlan, TripDay } from "../ai/types";
import { format, addDays } from "date-fns";

export interface TripTemplateItem {
  id: string;
  title: string;
  destination: string;
  durationDays: number;
  travelers: number;
  budgetLevel: "budget" | "moderate" | "luxury";
  estimatedBudget: number;
  currency: "BDT" | "USD";
  travelStyle: "backpacker" | "leisure" | "couple" | "family";
  summary: string;
  badge: string;
  tags: string[];
  highlights: string[];
  icon: string;
  gradient: [string, string];
  planGenerator: (startDate: Date) => TripPlan;
}

export const TRIP_TEMPLATES: TripTemplateItem[] = [
  {
    id: "coxs-bazar-3d",
    title: "কক্সবাজার ৩ দিন",
    destination: "Cox's Bazar",
    durationDays: 3,
    travelers: 2,
    budgetLevel: "moderate",
    estimatedBudget: 30000,
    currency: "BDT",
    travelStyle: "couple",
    summary: "বিশ্বের দীর্ঘতম সমুদ্র সৈকত, রোমাঞ্চকর মেরিন ড্রাইভ, হিমছড়ি ঝরনা ও তাজা রূপচাঁদা সি-ফুড ডাইনিং।",
    badge: "সবচেয়ে জনপ্রিয়",
    tags: ["সমুদ্র সৈকত", "মেরিন ড্রাইভ", "সি-ফুড", "সূর্যাস্ত"],
    highlights: ["ইনানী কোরাল বিচ", "খোলা চাঁদের গাড়িতে মেরিন ড্রাইভ", "সুগন্ধা পয়েন্টে সূর্যাস্ত", "বার্মিজ মার্কেট শপিং"],
    icon: "water-outline",
    gradient: ["#0284C7", "#0369A1"],
    planGenerator: (startDate: Date): TripPlan => {
      const day1Date = format(startDate, "yyyy-MM-dd");
      const day2Date = format(addDays(startDate, 1), "yyyy-MM-dd");
      const day3Date = format(addDays(startDate, 2), "yyyy-MM-dd");

      return {
        id: `tpl_plan_coxs_${Date.now()}`,
        travelStyle: "couple",
        title: "কক্সবাজার ৩ দিনের স্বপ্নিল সমুদ্র সফর",
        destination: "Cox's Bazar",
        durationDays: 3,
        totalEstimatedCost: 30000,
        currency: "BDT",
        summary: "বিশ্বের দীর্ঘতম প্রাকৃতিক সমুদ্র সৈকতে ৩ দিনের আনন্দময় ছুটি। মেরিন ড্রাইভ, ইনানী কোরাল বিচ এবং সুস্বাদু সী-ফুড ডাইনিং।",
        days: [
          {
            day: 1,
            date: day1Date,
            theme: "কলাতলী আগমন ও সুগন্ধা পয়েন্টে সূর্যাস্ত",
            activities: [
              {
                time: "10:30 AM",
                activity: "হোটেল চেক-ইন ও ডাব খেয়ে ফ্রেশ হওয়া",
                location: "কলাতলী বিচ রোড, কক্সবাজার",
                coordinates: { latitude: 21.4272, longitude: 92.0058 },
                duration: "1.5 hours",
                estimatedCost: 1000,
                notes: "সকালের জার্নি শেষে বিশ্রাম নিন এবং সমুদ্রের হিমেল বাতাস উপভোগ করুন।",
              },
              {
                time: "03:30 PM",
                activity: "লাবণী পয়েন্ট ও শামুক-ঝিনুক মার্কেটে ঘোরাঘুরি",
                location: "লাবণী বিচ",
                coordinates: { latitude: 21.4369, longitude: 91.9781 },
                duration: "2 hours",
                estimatedCost: 800,
                notes: "হাতে তৈরি ঝিনুকের অলঙ্কার ও সৈকতের মুক্ত হাওয়া উপভোগ।",
              },
              {
                time: "05:30 PM",
                activity: "গোল্ডেন আওয়ার সানসেট ও সৈকতে বিশ্রাম",
                location: "সুগন্ধা পয়েন্ট",
                coordinates: { latitude: 21.4215, longitude: 91.9825 },
                duration: "1.5 hours",
                estimatedCost: 500,
                notes: "বঙ্গোপসাগরের লাল আভা ছড়িয়ে পরা সূর্যাস্ত ক্যামেরাবন্দী করুন।",
              },
            ],
            meals: [
              {
                type: "breakfast",
                suggestion: "গরম পরোটা, ডিম ভাজি ও চা",
                dishName: "পরোটা ও স্পেশাল চা",
                restaurant: "কলাতলী ডাইনার",
              },
              {
                type: "lunch",
                suggestion: "তাজা রূপচাঁদা মাছ ফ্রাই, চেপা শুঁটকি ভর্তা ও ভাত",
                dishName: "রূপচাঁদা ফ্রাই ও ভর্তা থালি",
                restaurant: "পৌষী রেস্তোরাঁ",
              },
              {
                type: "dinner",
                suggestion: "বিচসাইড কোরাল মাছের বারবিকিউ ও নান",
                dishName: "লাইভ কোরাল বারবিকিউ",
                restaurant: "ঝাউবন রেস্টুরেন্ট",
              },
            ],
            accommodation: "সি-ভিউ রিসোর্ট, কলাতলী",
          },
          {
            day: 2,
            date: day2Date,
            theme: "মেরিন ড্রাইভ, হিমছড়ি পাহাড় ও ইনানী কোরাল বিচ",
            activities: [
              {
                time: "09:00 AM",
                activity: "খোলা চাঁদের গাড়িতে মেরিন ড্রাইভ রাইড",
                location: "মেরিন ড্রাইভ রোড",
                coordinates: { latitude: 21.3524, longitude: 92.0321 },
                duration: "2 hours",
                estimatedCost: 2500,
                notes: "একপাশে সুবিশাল পাহাড় আর অন্যপাশে গর্জন করা সমুদ্র।",
              },
              {
                time: "11:30 AM",
                activity: "হিমছড়ি ন্যাশনাল পার্ক ও ঝরনা দর্শন",
                location: "হিমছড়ি ইকো পার্ক",
                coordinates: { latitude: 21.3562, longitude: 92.0294 },
                duration: "1.5 hours",
                estimatedCost: 500,
                notes: "পাহাড়ের চূড়া থেকে সমুদ্রের ৩৬০ ডিগ্রি ভিউ পাওয়া যায়।",
              },
              {
                time: "02:30 PM",
                activity: "ইনানী কোরাল বিচে হাঁটা ও ওয়াটার স্পোর্টস",
                location: "ইনানী বিচ",
                coordinates: { latitude: 21.2291, longitude: 92.0526 },
                duration: "3 hours",
                estimatedCost: 1500,
                notes: "ধারালো প্রবালের ফাঁকে স্বচ্ছ পানি ও প্রবাল পাথর উপভোগ করুন।",
              },
            ],
            meals: [
              {
                type: "breakfast",
                suggestion: "বুফে ব্রেকফাস্ট রিসোর্টে",
                dishName: "কন্টিনেন্টাল বুফে",
                restaurant: "রিসোর্ট ক্যাফে",
              },
              {
                type: "lunch",
                suggestion: "ইনানী বিচের তাজা লাল কাঁকড়া ফ্রাই ও ভাত",
                dishName: "ক্র্যাব কারি ও কাঁচামরিচ ভর্তা",
                restaurant: "ইনানী বিচ ক্যাফে",
              },
              {
                type: "dinner",
                suggestion: "লবস্টার ও স্কুইড প্ল্যাটার",
                dishName: "সি-ফুড প্ল্যাটার",
                restaurant: "কোকো বিচ ক্লাউড",
              },
            ],
            accommodation: "সি-ভিউ রিসোর্ট, কলাতলী",
          },
          {
            day: 3,
            date: day3Date,
            theme: "মহেশখালী দ্বীপ অথবা বার্মিজ মার্কেট শপিং ও বিদায়",
            activities: [
              {
                time: "10:00 AM",
                activity: "বার্মিজ মার্কেট থেকে স্পেশাল কেনাকাটা",
                location: "বার্মিজ মার্কেট, টেকপাড়া",
                coordinates: { latitude: 21.4391, longitude: 92.1009 },
                duration: "2 hours",
                estimatedCost: 2000,
                notes: "স্থানীয় আচার, চকোলেট ও হস্তশিল্প কেনার সেরা জায়গা।",
              },
              {
                time: "01:00 PM",
                activity: "হোটেল চেক-আউট ও বিদায়ী সমুদ্র দর্শন",
                location: "কলাতলী বিচ",
                coordinates: { latitude: 21.4272, longitude: 92.0058 },
                duration: "1.5 hours",
                estimatedCost: 0,
                notes: "লাগেজ গুছিয়ে ঢাকায় ফেরার প্রস্তুতি গ্রহণ।",
              },
            ],
            meals: [
              {
                type: "breakfast",
                suggestion: "খিচুড়ি, ডিম ও বেগুন ভাজা",
                dishName: "ভুনা খিচুড়ি স্পেশাল",
                restaurant: "ঝিলংজা ডাইনিং",
              },
              {
                type: "lunch",
                suggestion: "কক্সবাজারের খাঁটি কাচ্চি অথবা শুঁটকি ভুনা",
                dishName: "ঐতিহ্যবাহী শুঁটকি ভুনা ও ডাল",
                restaurant: "পৌষী রেস্তোরাঁ",
              },
            ],
            accommodation: "প্রযোজ্য নয় (ফেরার দিন)",
          },
        ],
        budget: {
          totalBudget: 30000,
          currency: "BDT",
          perPersonPerDay: 5000,
          hotel: { category: "Hotel", estimated: 12000, percentage: 40, tips: "সমুদ্রমুখী ৩-স্টার হোটেল ও রিসোর্ট" },
          transport: { category: "Transport", estimated: 9000, percentage: 30, tips: "এসি বাস ও চাঁদের গাড়ি রিজার্ভ" },
          food: { category: "Food", estimated: 6000, percentage: 20, tips: "তাজা সী-ফুড ও ঐতিহ্যবাহী ভর্তা" },
          activities: { category: "Activities", estimated: 3000, percentage: 10, tips: "এন্ট্রি টিকেট, ওয়াটার রাইড ও টিপস" },
        },
        packingChecklist: [
          "সানগ্লাস ও ইউভি সানস্ক্রিন (SPF 50+)",
          "সুইমওয়্যার ও ওয়াটারপ্রুফ ফোন কভার",
          "হিমছড়ি পাহাড়ের জন্য হালকা আরামদায়ক জুতো",
          "পাওয়ার ব্যাংক ও অতিরিক্ত মেমোরি কার্ড",
          "ব্যক্তিগত জরুরি ফার্স্ট এইড কিট",
        ],
        tips: [
          "মেরিন ড্রাইভে যাওয়ার জন্য সকালে আগেভাগে চাঁদের গাড়ি রিজার্ভ করুন।",
          "ইনানী বিচের প্রবাল পাথরে খালি পায়ে হাঁটবেন না, হালকা স্যান্ডেল পরুন।",
          "পৌষী রেস্তোরাঁয় দুপুরের ভিড় এড়াতে ১টার মধ্যে পৌঁছানোর চেষ্টা করুন।",
        ],
      };
    },
  },
  {
    id: "sylhet-2d",
    title: "সিলেট ২ দিন",
    destination: "Sylhet",
    durationDays: 2,
    travelers: 2,
    budgetLevel: "budget",
    estimatedBudget: 18000,
    currency: "BDT",
    travelStyle: "family",
    summary: "সবুজ চা বাগান, রাতারগুল সোয়াম্প ফরেস্টের নির্মল জলরাশি, জাফলং পাথর ও পান্থুমাই ঝরনা।",
    badge: "উইকএন্ড স্পেশাল",
    tags: ["চা বাগান", "সোয়াম্প ফরেস্ট", "ঝরনা", "প্রকৃতি"],
    highlights: ["রাতারগুল সোয়াম্প ফরেস্ট নৌভ্রমণ", "মালনীছড়া প্রাচীন চা বাগান", "জাফলং জিরো পয়েন্ট", "সাতকড়া গরুর মাংস ভোজ"],
    icon: "leaf-outline",
    gradient: ["#059669", "#047857"],
    planGenerator: (startDate: Date): TripPlan => {
      const day1Date = format(startDate, "yyyy-MM-dd");
      const day2Date = format(addDays(startDate, 1), "yyyy-MM-dd");

      return {
        id: `tpl_plan_sylhet_${Date.now()}`,
        travelStyle: "family",
        title: "সিলেটের সবুজ ও জলের রাজ্য ২ দিন",
        destination: "Sylhet",
        durationDays: 2,
        totalEstimatedCost: 18000,
        currency: "BDT",
        summary: "চা কন্যা সিলেটের সবুজ পাহাড়ি উপত্যকা ও রাতারগুল সোয়াম্প ফরেস্টে ২ দিনের রিফ্রেশিং ট্যুর।",
        days: [
          {
            day: 1,
            date: day1Date,
            theme: "মালনীছড়া চা বাগান ও রাতারগুল সোয়াম্প ফরেস্ট",
            activities: [
              {
                time: "09:00 AM",
                activity: "মালনীছড়া চা বাগানে সকালের হাঁটা ও ছবি তোলা",
                location: "মালনীছড়া চা বাগান",
                coordinates: { latitude: 24.9038, longitude: 91.8685 },
                duration: "2 hours",
                estimatedCost: 300,
                notes: "১৮৫৪ সালে প্রতিষ্ঠিত এই চা বাগানের সবুজ গালিচা মন জুড়িয়ে দেয়।",
              },
              {
                time: "12:00 PM",
                activity: "রাতারগুল সোয়াম্প ফরেস্টে নৌকায় ট্রিপ",
                location: "রাতারগুল সোয়াম্প ফরেস্ট",
                coordinates: { latitude: 25.0003, longitude: 91.9304 },
                duration: "2.5 hours",
                estimatedCost: 1200,
                notes: "জলের ওপর হিজল-করচ গাছের ছায়ায় কাঠের নৌকায় অপরূপ শান্তি।",
              },
              {
                time: "05:00 PM",
                activity: "হযরত শাহজালাল (র.) মাজার জিয়ারত ও পায়রা চত্বর",
                location: "দরগাহ গেট, সিলেট সদর",
                coordinates: { latitude: 24.8949, longitude: 91.8687 },
                duration: "1.5 hours",
                estimatedCost: 200,
                notes: "ঐতিহাসিক মাজার ও শত শত জালালি পায়রার মিলনমেলা।",
              },
            ],
            meals: [
              {
                type: "breakfast",
                suggestion: "সিলেটি বাখরখানি ও দুধ চা",
                dishName: "বাখরখানি ও চা",
                restaurant: "দরগাহ রেস্তোরাঁ",
              },
              {
                type: "lunch",
                suggestion: "সাতকড়া দিয়ে খাসির মাংস ও রকমারি ভর্তা",
                dishName: "সিলেটি সাতকড়া গোষ্ত থালি",
                restaurant: "পাঁচ ভাই রেস্টুরেন্ট",
              },
              {
                type: "dinner",
                suggestion: "ভুট্টি মাছের ঝোল ও হাঁসের ভুনা",
                dishName: "দেশি হাঁস ভুনা ও পোলাও",
                restaurant: "পানসী রেস্তোরাঁ",
              },
            ],
            accommodation: "ইকো রিসোর্ট / হোটেল গার্ডেন ইন, জিন্দাবাজার",
          },
          {
            day: 2,
            date: day2Date,
            theme: "জাফলং পাথর রাজ্য ও মায়াবী ঝরনা",
            activities: [
              {
                time: "08:30 AM",
                activity: "জাফলং নদীর স্বচ্ছ জল ও জিরো পয়েন্ট দর্শন",
                location: "জাফলং, গোয়াইনঘাট",
                coordinates: { latitude: 25.1633, longitude: 92.0167 },
                duration: "3 hours",
                estimatedCost: 1500,
                notes: "ডাউকি নদীর ঝুলন্ত ব্রিজ ও মেঘালয়ের সবুজ পাহাড়ের দৃশ্য।",
              },
              {
                time: "01:30 PM",
                activity: "সংগ্রামপুঞ্জি ঝরনা ও খাসিয়া পুঞ্জি দর্শন",
                location: "জাফলং খাসিয়া পুঞ্জি",
                coordinates: { latitude: 25.1700, longitude: 92.0200 },
                duration: "2 hours",
                estimatedCost: 800,
                notes: "পান চাষ ও খাসিয়া ক্ষুদ্র নৃগোষ্ঠীর জীবনধারা অবলোকন।",
              },
              {
                time: "05:00 PM",
                activity: "হযরত শাহপরাণ (র.) মাজার ও সিলেটের শীতলপাটি কেনা",
                location: "শাহপরাণ গেট",
                coordinates: { latitude: 24.9125, longitude: 91.9328 },
                duration: "1.5 hours",
                estimatedCost: 1000,
                notes: "সিলেটের বিখ্যাত শীতলপাটি ও সাতকড়ার আচার কিনে বিদায়।",
              },
            ],
            meals: [
              {
                type: "breakfast",
                suggestion: "পরোটা, সবজি ও ভুনা ডিম",
                dishName: "সকালের নাশতা",
                restaurant: "জিন্দাবাজার ক্যাফে",
              },
              {
                type: "lunch",
                suggestion: "পিয়াইন নদীর তাজা বৈরালী মাছ ফ্রাই ও ভাত",
                dishName: "বৈরালী মাছের ঝোল",
                restaurant: "জাফলং ভিস্তা ইন",
              },
            ],
            accommodation: "প্রযোজ্য নয় (ঢাকার উদ্দেশ্যে রওনা)",
          },
        ],
        budget: {
          totalBudget: 18000,
          currency: "BDT",
          perPersonPerDay: 4500,
          hotel: { category: "Hotel", estimated: 7000, percentage: 39, tips: "শহরের প্রধান হোটেল বা ইকো-কটেজ" },
          transport: { category: "Transport", estimated: 6000, percentage: 33, tips: "সিলেট-জাফলং সিএনজি/প্রাইভেট কার রিজার্ভ" },
          food: { category: "Food", estimated: 3500, percentage: 20, tips: "পাঁচ ভাই ও পানসীর ঐতিহ্যবাহী খাবার" },
          activities: { category: "Activities", estimated: 1500, percentage: 8, tips: "নৌকা ভাড়া ও স্পট এন্ট্রি ফি" },
        },
        packingChecklist: [
          "হালকা ছাতা ও রেইনকোট (বৃষ্টির জন্য)",
          "পাথুরে রাস্তায় হাঁটার উপযোগী নন-স্লিপ গ্রিপ জুতো",
          "নৌভ্রমণের জন্য ওয়াটারপ্রুফ ব্যাগ",
          "মশানিরোধক ওডোমস ক্রিম",
        ],
        tips: [
          "রাতারগুলে দুপুরের আগে পৌঁছালে বনের ছায়া ও পাখির ডাক বেশি উপভোগ করা যায়।",
          "জাফলংয়ে জিরো পয়েন্ট পার হয়ে ভারতের সীমান্তে প্রবেশ করবেন না।",
        ],
      };
    },
  },
  {
    id: "sajek-3d",
    title: "সাজেক ভ্যালি ৩ দিন",
    destination: "Sajek Valley",
    durationDays: 3,
    travelers: 2,
    budgetLevel: "moderate",
    estimatedBudget: 24000,
    currency: "BDT",
    travelStyle: "backpacker",
    summary: "মেঘের দেশে মেঘের উপর কটেজে থাকা, হ্যালিপ্যাডে সূর্যাস্ত, কংলাক পাহাড় ট্র্যাকিং ও পাহাড়ি ব্যাম্বু চিকেন।",
    badge: "রোমাঞ্চকর ভ্রমণ",
    tags: ["মেঘের দেশ", "পাহাড়", "চাঁদের গাড়ি", "হ্যালিপ্যাড"],
    highlights: ["কংলাক পাহাড়ে মেঘ ছোঁয়া ট্রেকিং", "সাজেক হ্যালিপ্যাডে সুর্যাস্ত ও তারা দেখা", "সেনাবাহিনী এসকর্টে চাঁদের গাড়ি রাইড", "আদিবাসী ব্যাম্বু চিকেন ডিনার"],
    icon: "cloudy-outline",
    gradient: ["#6366F1", "#4338CA"],
    planGenerator: (startDate: Date): TripPlan => {
      const day1Date = format(startDate, "yyyy-MM-dd");
      const day2Date = format(addDays(startDate, 1), "yyyy-MM-dd");
      const day3Date = format(addDays(startDate, 2), "yyyy-MM-dd");

      return {
        id: `tpl_plan_sajek_${Date.now()}`,
        travelStyle: "backpacker",
        title: "সাজেক ভ্যালি ৩ দিনের মেঘের রাজ্য অভিযান",
        destination: "Sajek Valley",
        durationDays: 3,
        totalEstimatedCost: 24000,
        currency: "BDT",
        summary: "খাগড়াছড়ি হয়ে পাহাড়ি আঁকাবাঁকা পথ পেরিয়ে সাজেক ভ্যালির তুলতুলে মেঘে হারিয়ে যাওয়ার অসাধারণ অভিজ্ঞতা।",
        days: [
          {
            day: 1,
            date: day1Date,
            theme: "খাগড়াছড়ি এসকর্ট ও সাজেকে মেঘবরণ",
            activities: [
              {
                time: "10:00 AM",
                activity: "দিঘীনালা চেকপোস্টে মিলিটারি এসকর্টে যোগদান",
                location: "দিঘীনালা, খাগড়াছড়ি",
                duration: "3 hours",
                estimatedCost: 3500,
                notes: "পাহাড়ের বাঁকে বাঁকে রোলারকোস্টারের মতো চাঁদের গাড়ি ড্রাইভ।",
              },
              {
                time: "02:00 PM",
                activity: "সাজেক ভ্যালি কাঠের ইকো-কটেজে চেক-ইন",
                location: "রুইলুই পাড়া, সাজেক",
                duration: "1.5 hours",
                estimatedCost: 0,
                notes: "ব্যালকনি থেকে তুলতুলে সাদা মেঘের ঢেউ উপভোগ করুন।",
              },
              {
                time: "05:15 PM",
                activity: "হ্যালিপ্যাড ১ এ সূর্যাস্ত দর্শন ও কফি আড্ডা",
                location: "সাজেক হ্যালিপ্যাড",
                duration: "2 hours",
                estimatedCost: 400,
                notes: "সূর্য ডোবার পর সাজেকের পাহাড়ে ফুটে ওঠা রূপালী তারা দেখা।",
              },
            ],
            meals: [
              {
                type: "breakfast",
                suggestion: "খিচুড়ি ও ডিম ভুনা খাগড়াছড়িতে",
                dishName: "সকালের পাহাড়ি নাশতা",
                restaurant: "সিস্টেম রেস্তোরাঁ খাগড়াছড়ি",
              },
              {
                type: "lunch",
                suggestion: "পাহাড়ি মুরগি ও জুমের চালের ভাত",
                dishName: "দেশি মুরগির ঝোল ও সবজি",
                restaurant: "রুইলুই ফুড ক্যাফে",
              },
              {
                type: "dinner",
                suggestion: "বাঁশের চোঙায় রান্না করা ব্যাম্বু চিকেন ও পরোটা",
                dishName: "ঐতিহ্যবাহী ব্যাম্বু চিকেন",
                restaurant: "কাসালং রেস্টুরেন্ট",
              },
            ],
            accommodation: "মেঘমাচা ইকো কটেজ, সাজেক ভ্যালি",
          },
          {
            day: 2,
            date: day2Date,
            theme: "ভোরের মেঘদর্শন, কংলাক পাহাড় ও তারাভরা রাত",
            activities: [
              {
                time: "05:30 AM",
                activity: "ভোরের সূর্যোদয় ও মেঘের সমুদ্র অবলোকন",
                location: "কটেজ ব্যালকনি / হ্যালিপ্যাড ২",
                duration: "2 hours",
                estimatedCost: 0,
                notes: "সাজেকের সবচেয়ে জাদুকরী মুহূর্ত— পায়ের নিচে মেঘের স্রোত।",
              },
              {
                time: "09:30 AM",
                activity: "কংলাক পাহাড়ে হাইকিং ও ত্রিপুরা পাড়া দর্শন",
                location: "কংলাক পাড়া",
                duration: "3 hours",
                estimatedCost: 500,
                notes: "সাজেকের সর্বোচ্চ চূড়া থেকে মিজোরাম সীমান্তের পাহাড়ের দৃশ্য।",
              },
              {
                time: "04:30 PM",
                activity: "রুইলুই পাড়ায় পাহাড়ি ফল ও চা স্বাদ গ্রহণ",
                location: "রুইলুই ক্লাব চত্বর",
                duration: "2 hours",
                estimatedCost: 300,
                notes: "মিষ্টি পাহাড়ি পেঁপে, আনারস ও স্থানীয় কলা ট্রাই করুন।",
              },
            ],
            meals: [
              {
                type: "breakfast",
                suggestion: "গরম ডিম-খিচুড়ি কটেজে",
                dishName: "ভোরের খিচুড়ি স্পেশাল",
                restaurant: "কটেজ কিচেন",
              },
              {
                type: "lunch",
                suggestion: "পাহাড়ি আলু ভর্তা ও হাঁসের মাংস",
                dishName: "হাঁস ভুনা ও জুম চালের ভাত",
                restaurant: "মারুতি রেস্তোরাঁ",
              },
              {
                type: "dinner",
                suggestion: "লাইভ উড বারবিকিউ ও পাহাড়ি গান",
                dishName: "স্মোকি চিকেন বারবিকিউ",
                restaurant: "সাজেক নাইট লাউঞ্জ",
              },
            ],
            accommodation: "মেঘমাচা ইকো কটেজ, সাজেক ভ্যালি",
          },
          {
            day: 3,
            date: day3Date,
            theme: "আলুটিলা গুহা, তারেং ও ঢাকা প্রত্যাবর্তন",
            activities: [
              {
                time: "10:00 AM",
                activity: "সকাল ১০টার এসকর্টে খাগড়াছড়ির উদ্দেশ্যে নামা",
                location: "সাজেক রুইলুই গেট",
                duration: "2.5 hours",
                estimatedCost: 0,
                notes: "পাহাড়কে বিদায় জানিয়ে সমতলে ফেরা।",
              },
              {
                time: "01:30 PM",
                activity: "আলুটিলা রহস্যময় গুহা মশাল জ্বালিয়ে পার হওয়া",
                location: "আলুটিলা ইকো পার্ক, খাগড়াছড়ি",
                duration: "2 hours",
                estimatedCost: 400,
                notes: "অন্ধকার শীতল পাথুরে গুহার ভেতর ঝরনার পিচ্ছিল পথে অ্যাডভেঞ্চার।",
              },
            ],
            meals: [
              {
                type: "breakfast",
                suggestion: "পরোটা ও ডিম ভাজি",
                dishName: "সকালের নাশতা",
                restaurant: "রুইলুই ক্যাফে",
              },
              {
                type: "lunch",
                suggestion: "খাগড়াছড়ির বিখ্যাত পাহাড়ি খাবার হিল-স্পেশাল",
                dishName: "ব্যাম্বু শুট ও পাহাড়ি মাশরুম",
                restaurant: "সিস্টেম রেস্তোরাঁ, খাগড়াছড়ি",
              },
            ],
            accommodation: "প্রযোজ্য নয় (ঢাকার বাস যাত্রা)",
          },
        ],
        budget: {
          totalBudget: 24000,
          currency: "BDT",
          perPersonPerDay: 4000,
          hotel: { category: "Hotel", estimated: 10000, percentage: 42, tips: "মেঘের ভিউ সহ কাঠের সাজেক কটেজ" },
          transport: { category: "Transport", estimated: 8000, percentage: 33, tips: "চাঁদের গাড়ি রিজার্ভ ও বাস টিকেট" },
          food: { category: "Food", estimated: 4500, percentage: 19, tips: "ব্যাম্বু চিকেন ও খাঁটি পাহাড়ি খাবার" },
          activities: { category: "Activities", estimated: 1500, percentage: 6, tips: "মশাল, এন্ট্রি টিকেট ও গাইডিং" },
        },
        packingChecklist: [
          "জাতীয় পরিচয়পত্র (NID) কার্ডের ফটোকপি (চেকপোস্টে বাধ্যতামূলক)",
          "পাওয়ার ব্যাংক (সাজেকে বিদ্যুৎ আসা-যাওয়া করতে পারে)",
          "টর্চলাইট বা হেডল্যাম্প (আলুটিলা গুহা ও রাতে হাঁটার জন্য)",
          "হালকা জ্যাকেট বা শাল (ভোরে ও রাতে পাহাড়ে ঠান্ডা বাতাস থাকে)",
        ],
        tips: [
          "সাজেকে টেলিটক ও রবি নেটওয়ার্ক ভালো পাওয়া যায়, গ্রামীণফোন মাঝে মাঝে ড্রপ করে।",
          "মিলিটারি এসকর্টের নির্দিষ্ট সময় (সকাল ১০টা ও দুপুর ২টা) মিস করবেন না।",
        ],
      };
    },
  },
  {
    id: "sreemangal-2d",
    title: "শ্রীমঙ্গল ২ দিন",
    destination: "Sreemangal",
    durationDays: 2,
    travelers: 2,
    budgetLevel: "budget",
    estimatedBudget: 14000,
    currency: "BDT",
    travelStyle: "family",
    summary: "চায়ের রাজধানী শ্রীমঙ্গলে লাউয়াছড়া জাতীয় উদ্যানের বুনো সবুজ, নীলকণ্ঠের ৭ রঙের চা ও মাধবপুর লেক।",
    badge: "প্রকৃতি প্রেমিকদের পছন্দ",
    tags: ["চায়ের রাজধানী", "রেইনফরেস্ট", "লেক", "পাখি দর্শন"],
    highlights: ["লাউয়াছড়ায় উলুক বানর ও রেইনফরেস্ট ট্রেইল", "নীলকণ্ঠ টি কেবিনের ৭ স্তরের চা", "মাধবপুর লেকের পদ্মফুল", "নূরজাহান চা বাগান সাইক্লিং"],
    icon: "leaf-outline",
    gradient: ["#047857", "#065F46"],
    planGenerator: (startDate: Date): TripPlan => {
      const day1Date = format(startDate, "yyyy-MM-dd");
      const day2Date = format(addDays(startDate, 1), "yyyy-MM-dd");

      return {
        id: `tpl_plan_sreemangal_${Date.now()}`,
        travelStyle: "family",
        title: "শ্রীমঙ্গল ২ দিনের চা ও রেইনফরেস্ট রিট্রিট",
        destination: "Sreemangal",
        durationDays: 2,
        totalEstimatedCost: 14000,
        currency: "BDT",
        summary: "বিশ্ববিখ্যাত চা বাগান ও চিরসবুজ লাউয়াছড়া রেইনফরেস্টে দুই দিনের নির্মল প্রশান্তি।",
        days: [
          {
            day: 1,
            date: day1Date,
            theme: "চা বাগান ও নীলকণ্ঠের সাত রঙের চা",
            activities: [
              {
                time: "10:30 AM",
                activity: "ফিনলে চা বাগানে সাইকেল রাইড ও ছবি তোলা",
                location: "ফিনলে টি এস্টেট",
                duration: "2 hours",
                estimatedCost: 400,
                notes: "সবুজ গালিচায় সাজানো নিখুঁত চা বাগানের মাঝে স্নিগ্ধ বাতাস।",
              },
              {
                time: "02:30 PM",
                activity: "মাধবপুর লেকে প্যাডেল বা শান্ত বসে থাকা",
                location: "মাধবপুর লেক, কমলগঞ্জ",
                duration: "2.5 hours",
                estimatedCost: 600,
                notes: "ভারতের ত্রিপুরা সীমান্তবর্তী অপরূপ নীল জলের পদ্মফুল লেক।",
              },
              {
                time: "05:30 PM",
                activity: "নীলকণ্ঠ চা কেবিনে বিখ্যাত ৭ রঙের চা টেস্ট",
                location: "রামনগর মনিপুরী পাড়া",
                duration: "1 hour",
                estimatedCost: 350,
                notes: "প্রতি স্তরে আলাদা স্বাদ ও রঙের এক অনন্য চা আবিষ্কার।",
              },
            ],
            meals: [
              {
                type: "breakfast",
                suggestion: "পরোটা ও পাঁচমিশালি সবজি",
                dishName: "সকালের গরম নাশতা",
                restaurant: "শ্রীমঙ্গল স্টেশন ক্যাফে",
              },
              {
                type: "lunch",
                suggestion: "সাতকড়া গরুর মাংস ও স্থানীয় রুই মাছ",
                dishName: "সাতকড়া বিফ ও ডাল",
                restaurant: "গ্র্যান্ড তাজ রেস্তোরাঁ",
              },
              {
                type: "dinner",
                suggestion: "আদিবাসী মনিপুরী রন্ধনশৈলীর শাক ও মাছের তরকারি",
                dishName: "মনিপুরী ঐতিহ্যবাহী ডিনার",
                restaurant: "কুটিয়ার ইকো ডাইনিং",
              },
            ],
            accommodation: "ইকো টি রিসোর্ট, শ্রীমঙ্গল",
          },
          {
            day: 2,
            date: day2Date,
            theme: "লাউয়াছড়া রেইনফরেস্ট ট্র্যাকিং ও মনিপুরী পাড়া",
            activities: [
              {
                time: "07:30 AM",
                activity: "লাউয়াছড়া জাতীয় উদ্যানে মর্নিং ট্রেইল ও বানর দর্শন",
                location: "লাউয়াছড়া ন্যাশনাল পার্ক",
                duration: "3 hours",
                estimatedCost: 500,
                notes: "সকালে গেলে বিলুপ্তপ্রায় উল্লুক বানরের ডাক শোনার দারুণ সম্ভাবনা থাকে।",
              },
              {
                time: "11:30 AM",
                activity: "বধ্যভূমি ৭১ স্মৃতিসৌধ পরিদর্শন",
                location: "ভাড়াউড়া চা বাগান",
                duration: "1 hour",
                estimatedCost: 100,
                notes: "চা বাগানের ভেতরে ১৯৭১ সালের মুক্তিযুদ্ধের ঐতিহাসিক স্থান।",
              },
              {
                time: "03:00 PM",
                activity: "মনিপুরী হ্যান্ডলুম মার্কেটে শপিং",
                location: "ভানুবিল মনিপুরী পাড়া",
                duration: "2 hours",
                estimatedCost: 1500,
                notes: "হাতে বোনা মনিপুরী শাল, ওড়না ও শাড়ি কেনার সেরা জায়গা।",
              },
            ],
            meals: [
              {
                type: "breakfast",
                suggestion: "খিচুড়ি ও বেগুন ভাজা রিসোর্টে",
                dishName: "সকালের ইকো ব্রেকফাস্ট",
                restaurant: "রিসোর্ট লাউঞ্জ",
              },
              {
                type: "lunch",
                suggestion: "দেশি মুরগি ভুনা ও মুগ ডাল",
                dishName: "দেশি মোরগ ভুনা থালি",
                restaurant: "পানসী শ্রীমঙ্গল ব্রাঞ্চ",
              },
            ],
            accommodation: "প্রযোজ্য নয় (ঢাকার ট্রেন যাত্রা)",
          },
        ],
        budget: {
          totalBudget: 14000,
          currency: "BDT",
          perPersonPerDay: 3500,
          hotel: { category: "Hotel", estimated: 5500, percentage: 39, tips: "চা বাগান ঘেরা নিরিবিলি ইকো কটেজ" },
          transport: { category: "Transport", estimated: 4500, percentage: 32, tips: "ট্রেন টিকেট ও স্থানীয় সিএনজি রিজার্ভ" },
          food: { category: "Food", estimated: 2800, percentage: 20, tips: "ঐতিহ্যবাহী খাবার ও চা আস্বাদন" },
          activities: { category: "Activities", estimated: 1200, percentage: 9, tips: "পার্ক এন্ট্রি ফি ও সাইকেল ভাড়া" },
        },
        packingChecklist: [
          "হাঁটার উপযুক্ত আরামদায়ক স্নিকার্স",
          "জঙ্গলে জোঁক থেকে রক্ষা পাওয়ার জন্য উঁচু মোজা ও লবণ",
          "ক্যামেরা বা দূরবীন (পাখি দেখার জন্য)",
          "বৃষ্টির জন্য ওয়াটারপ্রুফ উইন্ডব্রেকার",
        ],
        tips: [
          "লাউয়াছড়ায় বনের ভেতর কোনো প্লাস্টিক বা আবর্জনা ফেলবেন না।",
          "ট্রেনের টিকেট শ্রীমঙ্গলে আসার জন্য সবচেয়ে আরামদায়ক বাহন (পারাবত বা জয়ন্তিকা)।",
        ],
      };
    },
  },
];

/**
 * Instantly instantiate a TripPlan from a template with real dynamic dates.
 */
export function instantiateTripTemplate(templateId: string, startDate?: Date): TripPlan {
  const chosenDate = startDate || new Date();
  const template = TRIP_TEMPLATES.find((t) => t.id === templateId) || TRIP_TEMPLATES[0];
  return template.planGenerator(chosenDate);
}
