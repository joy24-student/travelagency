/**
 * Shopno Jatra - Official Enterprise Brand Identity & Unified Constants
 * 
 * Single Source of Truth for brand naming, typography, legal designations,
 * and system identifiers across the entire application ecosystem.
 */

export const BRAND = {
  /**
   * Official localized display names for screens and user-facing UI
   */
  name: {
    en: "Shopno Jatra",
    bn: "স্বপ্নযাত্রা",
    ar: "شوبنو جاترا",
    hi: "स्वप्न जात्रा",
  },

  /**
   * Short brand name or acronym
   */
  shortName: "Shopno Jatra",

  /**
   * Taglines in supported languages
   */
  tagline: {
    en: "Your Seamless Travel & Financial Companion",
    bn: "আপনার বিশ্বস্ত ভ্রমণ ও আর্থিক সঙ্গী",
    ar: "رفيقك السلس في السفر والمالية",
    hi: "आपका विश्वसनीय यात्रा और वित्तीय साथी",
  },

  /**
   * Official registered legal entity names for receipts, invoices, and compliance
   */
  legalName: {
    en: "Shopno Jatra Fintech & Travel Technologies Ltd.",
    bn: "স্বপ্নযাত্রা ফিনটেক অ্যান্ড ট্রাভেল টেকনোলজিস লিমিটেড",
    ar: "شركة شوبنو جاترا للتقنية المالية وخدمات السفر المحدودة",
    hi: "स्वप्न जात्रा फिनटेक एंड ट्रैवल टेक्नोलॉजीज लिमिटेड",
  },

  /**
   * System and Cloud infrastructure slugs
   */
  identifiers: {
    appId: "com.shopnojatra.app",
    scheme: "shopnojatra",
    firebaseProjectId: "swapnojatra-c04a0",
    firebaseStorageBucket: "swapnojatra-c04a0.firebasestorage.app",
    backendService: "ShopnoJatra-Core-API",
  },

  /**
   * Support and corporate contact channels
   */
  contact: {
    supportEmail: "support@shopnojatra.com",
    complianceEmail: "compliance@shopnojatra.com",
    phone: "+880 9612-746766",
    website: "https://shopnojatra.com",
    headquarters: {
      address: "Navana Tower, Gulshan-1, Dhaka-1212, Bangladesh",
      bnAddress: "নাভানা টাওয়ার, গুলশান-১, ঢাকা-১২১২, বাংলাদেশ",
    },
  },
} as const;

/**
 * Returns the official brand name matching the active locale
 * @param locale Current active language code ('en' | 'bn' | 'ar' | 'hi')
 */
export function getBrandName(locale: string = "en"): string {
  const norm = (locale || "en").toLowerCase();
  if (norm.startsWith("bn")) return BRAND.name.bn;
  if (norm.startsWith("ar")) return BRAND.name.ar;
  if (norm.startsWith("hi")) return BRAND.name.hi;
  return BRAND.name.en;
}

/**
 * Returns the official registered legal company name matching the active locale
 */
export function getBrandLegalName(locale: string = "en"): string {
  const norm = (locale || "en").toLowerCase();
  if (norm.startsWith("bn")) return BRAND.legalName.bn;
  if (norm.startsWith("ar")) return BRAND.legalName.ar;
  if (norm.startsWith("hi")) return BRAND.legalName.hi;
  return BRAND.legalName.en;
}

/**
 * Returns the brand tagline matching the active locale
 */
export function getBrandTagline(locale: string = "en"): string {
  const norm = (locale || "en").toLowerCase();
  if (norm.startsWith("bn")) return BRAND.tagline.bn;
  if (norm.startsWith("ar")) return BRAND.tagline.ar;
  if (norm.startsWith("hi")) return BRAND.tagline.hi;
  return BRAND.tagline.en;
}

export default BRAND;
