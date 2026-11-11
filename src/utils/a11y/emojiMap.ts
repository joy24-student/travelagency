/**
 * Emoji-to-Vector-Icon Accessible Mapping - Shopno Jatra
 * Screen readers frequently read emojis inconsistently (e.g., "grinning face with sweat", "police car with light"),
 * and system emojis vary across Android OEMs (Samsung, Xiaomi, Pixel) and iOS.
 *
 * This mapping translates common emojis into clean @expo/vector-icons (Ionicons)
 * with localized, human-friendly accessibility labels.
 */

export interface VectorIconMapping {
  ionicon: string;
  enLabel: string;
  bnLabel: string;
  defaultColor?: string;
}

export const EMOJI_ICON_MAP: Record<string, VectorIconMapping> = {
  // Location & Navigation
  "📍": { ionicon: "location-sharp", enLabel: "Location pin", bnLabel: "অবস্থান পিন", defaultColor: "#ef4444" },
  "🗺️": { ionicon: "map-outline", enLabel: "Map", bnLabel: "মানচিত্র", defaultColor: "#287dfa" },
  "🌍": { ionicon: "globe-outline", enLabel: "Global destinations", bnLabel: "বিশ্বব্যাপী গন্তব্য", defaultColor: "#10b981" },

  // Travel & Transport
  "✈️": { ionicon: "airplane", enLabel: "Flight", bnLabel: "ফ্লাইট", defaultColor: "#287dfa" },
  "🏨": { ionicon: "bed-outline", enLabel: "Hotel accommodation", bnLabel: "হোটেল ও থাকার জায়গা", defaultColor: "#1a237e" },
  "🚗": { ionicon: "car-outline", enLabel: "Car rental", bnLabel: "গাড়ি রেন্টাল", defaultColor: "#287dfa" },
  "🚐": { ionicon: "bus-outline", enLabel: "Shuttle bus", bnLabel: "শাটল বাস", defaultColor: "#287dfa" },
  "🎟️": { ionicon: "ticket-outline", enLabel: "Voucher and ticket", bnLabel: "ভাউচার ও টিকিট", defaultColor: "#eab308" },
  "🛶": { ionicon: "boat-outline", enLabel: "Boat tour", bnLabel: "নৌকা ভ্রমণ", defaultColor: "#059669" },

  // Safety & Emergency
  "🚨": { ionicon: "alert-circle", enLabel: "Emergency SOS", bnLabel: "জরুরি সতর্কতা", defaultColor: "#ef4444" },
  "⚠️": { ionicon: "warning-outline", enLabel: "Warning notice", bnLabel: "সতর্কবার্তা", defaultColor: "#f59e0b" },
  "🛡️": { ionicon: "shield-checkmark-outline", enLabel: "Safety guaranteed", bnLabel: "নিরাপত্তা নিশ্চিত", defaultColor: "#10b981" },
  "🏥": { ionicon: "medical-outline", enLabel: "Hospital", bnLabel: "হাসপাতাল", defaultColor: "#ef4444" },
  "👮": { ionicon: "shield-outline", enLabel: "Tourist police", bnLabel: "ট্যুরিস্ট পুলিশ", defaultColor: "#1a237e" },
  "💊": { ionicon: "medkit-outline", enLabel: "Pharmacy", bnLabel: "ফার্মেসি", defaultColor: "#10b981" },

  // Status & Feedback
  "🟢": { ionicon: "ellipse", enLabel: "Online and active", bnLabel: "অনলাইন ও সক্রিয়", defaultColor: "#10b981" },
  "🟡": { ionicon: "ellipse", enLabel: "Pending or idle", bnLabel: "অপেক্ষমাণ", defaultColor: "#f59e0b" },
  "🔴": { ionicon: "ellipse", enLabel: "Error or offline", bnLabel: "অফলাইন বা ত্রুটি", defaultColor: "#ef4444" },
  "🎉": { ionicon: "gift-outline", enLabel: "Celebration reward", bnLabel: "পুরস্কার", defaultColor: "#f59e0b" },
  "🔥": { ionicon: "flame", enLabel: "Trending offer", bnLabel: "জনপ্রিয় অফার", defaultColor: "#f97316" },
  "⭐": { ionicon: "star", enLabel: "Rating star", bnLabel: "স্টার রেটিং", defaultColor: "#eab308" },
  "★": { ionicon: "star", enLabel: "Official seal star", bnLabel: "স্টার চিহ্ন", defaultColor: "#eab308" },

  // Finance & Communication
  "💰": { ionicon: "cash-outline", enLabel: "Budget and payment", bnLabel: "বাজেট ও পেমেন্ট", defaultColor: "#10b981" },
  "📸": { ionicon: "camera-outline", enLabel: "Photo camera", bnLabel: "ক্যামেরা ছবি", defaultColor: "#287dfa" },
  "📅": { ionicon: "calendar-outline", enLabel: "Date schedule", bnLabel: "তারিখ ক্যালেন্ডার", defaultColor: "#1a237e" },
  "🔍": { ionicon: "search-outline", enLabel: "Search", bnLabel: "অনুসন্ধান", defaultColor: "#287dfa" },
  "🔒": { ionicon: "lock-closed-outline", enLabel: "Locked feature", bnLabel: "লক করা", defaultColor: "#64748b" },
  "🎵": { ionicon: "musical-notes-outline", enLabel: "Audio soundscape", bnLabel: "অডিও সঙ্গীত", defaultColor: "#287dfa" },
  "🍃": { ionicon: "leaf-outline", enLabel: "Nature ambient sound", bnLabel: "প্রকৃতির আবহ", defaultColor: "#10b981" },
};

/**
 * Resolves an emoji to a clean Vector Icon configuration or returns null.
 */
export function resolveEmojiToVectorIcon(emoji: string): VectorIconMapping | null {
  return EMOJI_ICON_MAP[emoji.trim()] || null;
}
